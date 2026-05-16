import prisma from '../../lib/prisma';
import { Prisma, product_type, step_scope } from '@prisma/client';
import { HttpError } from '../../utils/errors';
import { employee_role, step_name, step_event_type, } from '@prisma/client';
import { roleStatusMap, workflow } from './orders.workflow';
//import { buildState } from './state/state';
import { OrderStatusV2, WorkflowV2, WorkflowProductType, WorkflowStep, EventType } from "../../types/orderStatus"
//import { canStartStepV2 } from './domain/canStartStep';
//import { assertRoleCanAccessStep } from './domain/roleGuard';
import { handleEnd } from './handlers/handleEnd';
import { handleStart } from './handlers/handleStart';
//import { stepScope } from './orders.workflow';
import { getWorkflow, getStepFromRole, getStepDependencies, validateStepCanStart } from './domain/workflowContext';

type CreateOrderData = Prisma.orderCreateInput;
//type CreateOrderParts = Prisma.order_partsCreateInput

export const getAllOrdersService = async () => {
    return await prisma.order.findMany({
        orderBy: { due_date: 'asc' }
    });
};

export const getOrderService = async (orderNumber: number) => {
    const order = await prisma.order.findUnique({
        where: {
            order_number: orderNumber
        },
        include: {
          step_logs: true
        }
    });
    if (!order) {
        throw new HttpError('Order not found', 404);
    };
    return order
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
};

//const BLOCKING_STATUSES = ['active', 'done'] as const;

export const createStepEventV2 = async (orderNumber: number, userId: string, role: employee_role, eventType: EventType, orderPartId: string, stepQuantity?: number) => {
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

      await validateStepCanStart({ tx, order, role, step,orderPartId });

      return handleStart({tx, order, userId, role, step, orderPartId });
    }

    if (eventType === 'END') {
      if (!stepQuantity) {
        throw new HttpError('Step quantity required', 400);
      }

      return handleEnd({
        tx,
        order,
        userId,
        role,
        wf,
        stepQuantity,
        orderPartId
      });
    }

    throw new HttpError('Invalid event type', 400);
  });
};

