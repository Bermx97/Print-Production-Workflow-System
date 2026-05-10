import prisma from '../../lib/prisma';
import { Prisma } from '@prisma/client';
import { HttpError } from '../../utils/errors';
import { employee_role, step_name, step_event_type } from '@prisma/client';
import { roleStatusMap, workflow } from './orders.workflow';
import { OrderStatus, ORDER_STATUSES } from '../../types/orderStatus';

type CreateOrderData = Prisma.orderCreateInput;

export const getOrdersService = async () => {
    return await prisma.order.findMany({
        orderBy: { due_date: 'asc' }
    });
};

export const getMyOrdersService = async (
  userRole: employee_role
) => {
  const access = roleStatusMap[userRole];

  if (!access) {
    throw new HttpError('No access', 403);
  }

  if (access.type === "ALL") {
    return prisma.order.findMany({
      orderBy: {
        due_date: 'asc'
      }
    });
  }

  const orders = await prisma.order.findMany({
    orderBy: {
      due_date: 'asc'
    }
  });

  return orders.filter(order => {
    const productWorkflow = workflow[order.product_type];

    if (!productWorkflow) return false;

    const validSteps = access.steps.filter(
      step => productWorkflow[step] !== undefined
    );

    return validSteps.some(step => {
      if (order.completed_steps.includes(step)) {
        return false;
      }
      
      const deps = productWorkflow[step] ?? [];

      return deps.every(dep =>
        order.completed_steps.includes(dep)
      );
    });
  });
};

export const getOrderService = async (orderNumber: number) => {
    const order = await prisma.order.findUnique({
        where: {
            order_number: orderNumber
        }
    });
    if (!order) {
        throw new HttpError('Order not found', 404);
    };
    return order
};

export const createOrderService = async (data: CreateOrderData) => {
    return await prisma.order.create({ data });
};

export const nextStepService = async (orderNumber: number, role: employee_role, id: string, stepQuantities: Record<OrderStatus, number>) => {
  const order = await getOrderService(orderNumber);

  const access = roleStatusMap[role];

  if (!access) {
    throw new HttpError('Role not found', 403);
  }

  const productWorkflow = workflow[order.product_type];

  if (!productWorkflow) {
    throw new HttpError('Workflow not found for product type', 500);
  }

  const roleSteps =
    access.type === 'ALL'
      ? (Object.keys(productWorkflow) as OrderStatus[])
      : access.steps;

  const validSteps = roleSteps.filter(
    step => productWorkflow[step] !== undefined
  );

  const availableSteps = validSteps.filter(step => {
    if (order.completed_steps.includes(step)) return false;

    const dependencies = productWorkflow?.[step] ?? [];

    return dependencies.every(dep =>
      order.completed_steps.includes(dep)
    );
  });

  if (availableSteps.length === 0) {
    throw new HttpError('No available steps', 409);
  }

  const step = availableSteps[0];

  const dependencies = productWorkflow?.[step] ?? [];

  const canExecute = dependencies.every(dep =>
    order.completed_steps.includes(dep)
  );

  if (!canExecute) {
    throw new HttpError('Step blocked by dependencies', 409);
  }

  const quantity = Number(stepQuantities);


  const existingQuantities: Record<string, number> =
    (order.step_quantities as Record<string, number>) ?? {};

  const updatedQuantities: Record<string, number> = {
    ...existingQuantities,
    [step]: quantity
  };


  return await prisma.order.update({
    where: { order_number: orderNumber },
    data: {
      completed_steps: {
        push: step
      },
      step_quantities: updatedQuantities
    }
  });
}



export const createStepLogService = async (orderNumber: number, id: string, eventType: step_event_type, stepName: step_name) => {
    const order = await getOrderService(orderNumber);

    if (!order) throw new HttpError('Order not found', 404);
    
    const lastLog = await prisma.step_logs.findFirst({
  where: {
    order_id: order.id,
    step_name: stepName
  },
  orderBy: {
    created_at: 'desc'
  }
});

const isActive = lastLog?.event_type === 'START';
if (eventType === 'START' && isActive) {
  throw new HttpError('Step already started', 409);
}
if (eventType === 'END' && !isActive) {
  throw new HttpError('Step not started', 409);
}

    const logData = {
    step_name: stepName,
    order_id: order.id,
    employee: id,
    event_type: eventType
  }
  const log = await prisma.step_logs.create(
    { data: logData }
  )
  return log
}


export const getOrderStateService = async (orderNumber: number) => {
  const order = await getOrderService(orderNumber);

  const logs = await prisma.step_logs.findMany({
    where: { order_id: order.id },
    orderBy: { created_at: "asc" },
  });

  const stepMap = new Map<string, { start: boolean; end: boolean }>();

  for (const log of logs) {
    if (!stepMap.has(log.step_name)) {
      stepMap.set(log.step_name, { start: false, end: false });
    }

    const step = stepMap.get(log.step_name)!;

    if (log.event_type === "START") step.start = true;
    if (log.event_type === "END") step.end = true;
  }

  const currentStep = [...stepMap.entries()].find(
    ([_, value]) => value.start && !value.end
  )?.[0] ?? null;

  return {
    logs,
    currentStep,
  };
};