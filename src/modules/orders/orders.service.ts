import prisma from '../../lib/prisma';
import { Prisma } from '@prisma/client';
import { HttpError } from '../../utils/errors';
import { employee_role } from '@prisma/client';
import { roleStatusMap, workflow } from './orders.workflow';
import { OrderStatus, ORDER_STATUSES } from '../../types/orderStatus';

type CreateOrderData = Prisma.orderCreateInput;

export const getOrdersService = async () => {
    return await prisma.order.findMany({
        orderBy: { due_date: 'asc' }
    });
};

export const getMyOrdersService = async (userRole: employee_role) => {
  const access = roleStatusMap[userRole];

  if (!access) {
    throw new HttpError('No access', 403);
  }

  const orders = await prisma.order.findMany();

  return orders.filter(order => {
    const productWorkflow = workflow[order.product_type];

    if (!productWorkflow) return false;

    const roleSteps =
      access.type === "ALL"
        ? (Object.keys(productWorkflow) as OrderStatus[])
        : access.steps;

    const validSteps = roleSteps.filter(
      step => productWorkflow[step] !== undefined
    );

    return validSteps.some(step =>
      !order.completed_steps.includes(step)
    );
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



export const nextStepService = async (orderNumber: number,userRole: employee_role) => {
  const order = await getOrderService(orderNumber);

  const access = roleStatusMap[userRole];

  if (!access) {
    throw new HttpError('Role not found', 403);
  }

  const productWorkflow = workflow[order.product_type];

  if (!productWorkflow) {
    throw new HttpError('Workflow not found for product type', 500);
  }

  const roleSteps =
    access.type === 'ALL'
      ? Object.keys(productWorkflow) as OrderStatus[]
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

  return prisma.order.update({
    where: { order_number: orderNumber },
    data: {
      completed_steps: {
        push: step
      }
    }
  });
};