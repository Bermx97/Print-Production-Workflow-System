import { employee_role, Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { EventType, OrderStatusV2 } from "../../types/orderStatus";
import { HttpError } from '../../utils/errors';
import { getStepFromRole, getWorkflow } from './domain/workflowContext';
import { handleEnd } from './handlers/handleEnd';
import { handlePause } from './handlers/handlePause';
import { handleResume } from './handlers/handleResume';
import { handleStart } from './handlers/handleStart';
import { roleStatusMap, workflow } from './orders.workflow';
import { findCurrentExecution } from './workflow/queries/execution.queries';
import { validateStepCanStart } from './workflow/rules/dependency.rules';

type CreateOrderData = Prisma.orderCreateInput;


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

export const getMyOrdersService = async (userRole: employee_role) => {
  const access = roleStatusMap[userRole];

  if (!access) {
    throw new HttpError('No access', 403);
  }

  const orders = await prisma.order.findMany({
    include: {
      step_logs: true,
    },
    orderBy: {
      due_date: 'asc'
    }
  });

  return orders.filter(order => {
    const productWorkflow = workflow[order.product_type];

    if (!productWorkflow) return false;

    const logs = order.step_logs;

    const allowedSteps =
      access.type === 'ALL'
        ? (Object.keys(productWorkflow) as OrderStatusV2[])
        : (access.steps as OrderStatusV2[]).filter(step => productWorkflow[step]);

    return allowedSteps.some((step) => {
      const stepLogs = logs.filter(l => l.step_name === step);

      const hasStart = stepLogs.some(l => l.event_type === 'START');
      const hasEnd = stepLogs.some(l => l.event_type === 'END');

      const deps = productWorkflow[step] ?? [];

      const depsDone = deps.every(dep =>
        logs.some(l => l.step_name === dep && l.event_type === 'END')
      );

      if (!depsDone) return false;

      return !hasEnd;
    });
  });
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
    const order = await tx.order.findFirst({
      where: {
        order_number: orderNumber
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

