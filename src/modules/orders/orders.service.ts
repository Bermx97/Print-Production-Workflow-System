import { employee_role, Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { EventType, OrderStatusV2 } from "../../types/orderStatus";
import { HttpError } from '../../utils/errors';
import { getStepFromRole, getWorkflow, getWorkflowMap, } from './domain/workflowContext';
import { handleEnd } from './handlers/handleEnd';
import { handlePause } from './handlers/handlePause';
import { handleResume } from './handlers/handleResume';
import { handleStart } from './handlers/handleStart';
import { getPartsForStep, roleStatusMap, workflow } from './orders.workflow';
import { findCurrentExecution } from './workflow/queries/execution.queries';
import { validateStepCanStart } from './workflow/rules/dependency.rules';
import { getRoleSteps } from './workflow/access/role.access';
import { getOrderState } from './workflow/state/orderState.service';
import { getScope } from './domain/workflowContext';
import { canStartStepForPart } from './workflow/rules/dependency.rules';
import { IN_PROGRESS_STATUSES } from './domain/workflowContext';

type CreateOrderData = Prisma.orderCreateInput;

export const getMyActiveStepsService = async (userId: string) => {
  const activeExecutions = await prisma.step_execution.findMany({
    where: { status: 'active'},
    include: { order_part: true, order: true }
  });
  const activeOrderIds = activeExecutions.map(c => c.order_id);
  const employeeLogs = await prisma.step_logs.findMany({
    where: {
      employee: userId,
      order_id: { in: activeOrderIds } 
    }
  });
  const myActiveExecutions = activeExecutions.filter(execution => {
    return employeeLogs.some(log => 
      log.order_id === execution.order_id &&
      log.step_name === execution.step_type &&
      log.order_part_id === execution.order_part_id
    );
  });
  return myActiveExecutions;
}

export const getAllOrdersService = async () => {
  return await prisma.order.findMany({
    orderBy: { due_date: 'asc' }
  });
};

export const getOrderPartsService = async (orderNumber: number) => {
  const order = await prisma.order.findUnique({
    where: {
      order_number: orderNumber
    },
    select: {
      id: true
    }
  });

  if (!order) {
    throw new HttpError('Order not found', 404);
  };
  return await prisma.order_parts.findMany({
    where: {
      order_id: order.id
    }
  });
};

export const getOrderService = async (orderNumber: number) => {
  const order = await prisma.order.findUnique({
    where: {
      order_number: orderNumber
    },
    include: {
      step_logs: true,
      order_parts: true
    }
  });
  if (!order) {
    throw new HttpError('Order not found', 404);
  };
  return order
};

export const getOrderWithRelations = async (orderNumber: number) => {
  const order = await prisma.order.findUnique({
    where: { order_number: orderNumber },
    include: {
      order_parts: true,
      step_execution: true,
    },
  });

  if (!order) {
    throw new HttpError('Order not found', 404);
  };
  
  return order;
};

export const createOrderService = async (data: CreateOrderData, partsData: Omit<Prisma.order_partsCreateManyInput, 'order_id'>[]) => {
  const order = await prisma.order.create({ data });

  await prisma.order_parts.createMany({
    data: partsData.map(part => ({
      ...part,
      order_id: order.id
    }))
  });
  return order
};


export const createStepEventV2 = async (orderNumber: number, userId: string, role: employee_role, eventType: EventType, orderPartId: string, doneQuantity?: number) => {
  return prisma.$transaction(async (tx) => {
    
    const [lockedOrder] = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "order"
    WHERE "order_number" = ${orderNumber}
    FOR UPDATE
  `;

  if (!lockedOrder) {
    throw new HttpError('Order not found', 404);
  }

  const order = await tx.order.findUnique({
    where: {
      id: lockedOrder.id
    }
  });

    if (!order) {
      throw new HttpError('Order not found', 404);
    }

    const wf = getWorkflow(order);

    if (eventType === 'START') {
      const step = getStepFromRole(wf, role);
      const currentExecution = await findCurrentExecution({
        tx,
        order,
        step,
        orderPartId
      });

      if (currentExecution?.status === 'paused') {
        return handleResume({ tx, order, userId, role, orderPartId });
      }

      await validateStepCanStart({ tx, order, role, step, orderPartId });

      return handleStart({ tx, order, userId, role, step, orderPartId });
    }

    if (eventType === 'END') {
      if (typeof doneQuantity !== 'number') {
        throw new HttpError('Step quantity required', 400);
      }

      return handleEnd({ tx, order, userId, role, wf, doneQuantity, orderPartId });
    }

    if (eventType === 'PAUSE') {
      return handlePause({ tx, order, userId, role, orderPartId });
    }

    if (eventType === 'RESUME') {
      return handleResume({ tx, order, userId, role, orderPartId });
    }

    throw new HttpError('Invalid event type', 400);
  });
};

export const getVisibleOrdersForRole = async (role: employee_role, access: any) => {
    const orders = await prisma.order.findMany({ 
      include: { order_parts: true },
      orderBy: { order_number: 'asc' }
    });

    const orderIds = orders.map(o => o.id);
    const allExecutions = await prisma.step_execution.findMany({
      where: { order_id: { in: orderIds } },
      orderBy: { started_at: 'desc' }
    });

    const executionsByOrder = new Map<string, any[]>();
    for (const ex of allExecutions) {
      if (!executionsByOrder.has(ex.order_id)) {
        executionsByOrder.set(ex.order_id, []);
      }
      executionsByOrder.get(ex.order_id)!.push(ex);
    }

    if (access.type === 'ALL') {
      return Promise.all(
        orders.map(async (o) => ({
          ...o,
          state: await getOrderState(o, getWorkflowMap(o.product_type)!, executionsByOrder.get(o.id) || [])
        }))
      );
    }

    const genericExecutions = new Set<string>();
    const partExecutions = new Set<string>();

    for (const ex of allExecutions) {
      if (IN_PROGRESS_STATUSES.includes(ex.status as any)) {
        genericExecutions.add(`${ex.order_id}_${ex.step_type}`);
        if (ex.order_part_id) {
          partExecutions.add(`${ex.order_id}_${ex.step_type}_${ex.order_part_id}`);
        }
      }
    }

    const visibleOrders = [];

    for (const order of orders) {
      const wf = getWorkflowMap(order.product_type);
      if (!wf) continue;

      const allowedSteps = getRoleSteps(role, wf);
      let isVisible = false;
      const orderExecutions = executionsByOrder.get(order.id) || [];

      for (const step of allowedSteps) {
        const scope = getScope(step);
        const partsToCheck = scope === 'per_part' ? getPartsForStep(order.order_parts, step) : [undefined];

        for (const part of partsToCheck) {
          const inProgress = part === undefined
            ? genericExecutions.has(`${order.id}_${step}`)
            : partExecutions.has(`${order.id}_${step}_${part.id}`);

          if (inProgress || await canStartStepForPart({ order, wf, step, orderPartId: part?.id }, orderExecutions)) {
            isVisible = true; 
            break;
          }
        }
        if (isVisible) break;
      }

      if (isVisible) {
        visibleOrders.push({ 
          ...order, 
          state: await getOrderState(order, wf, orderExecutions) 
        });
      }
    }

    return visibleOrders;
};
