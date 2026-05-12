import { Request, Response } from 'express';
import { createOrderService, getOrdersService, getOrderService, getMyOrdersService, nextStepService, createStepLogService, createStepEventV2 } from './orders.service';
import { HttpError } from '../../utils/errors';
import prisma from '../../lib/prisma';
import { workflow, roleStatusMap, getWorkflow } from './orders.workflow';
import { buildState } from './state/state';
import { canStartStep } from './domain/canStartStep';

export const getOrders = async (req: Request, res: Response) => {
  const orders = await getOrdersService();
  return res.status(200).json(orders);
};

export const getOrderByNumber = async (req: Request, res: Response) => {
  const { orderNumber } = req.params;

  const order = await getOrderService(Number(orderNumber));

  if (!order) {
    return res.status(404).json({ message: 'Order not found'  });
  }

  return res.status(200).json({
    ...order,
    workflow: getWorkflow(order.product_type)
  });
};

export const createOrder = async (req: Request, res: Response) => {
  const { orderNumber, dueDate, productType, quantity, customer, numberOfPages } = req.body;
  const existing = await prisma.order.findUnique({
    where: { order_number: orderNumber }
  });

  if (existing) {
    throw new HttpError(`Order ${orderNumber} already exists`, 409);
  }

  const data = {
    order_number: Number(orderNumber),
    due_date: new Date(dueDate),
    product_type: productType,
    createdBy: { connect: { id: req.user.id } },
    quantity: quantity,
    customer: customer,
    number_of_pages: numberOfPages,
  }

  const result = await createOrderService(data);
  res.status(201).json({ message: `Order ${orderNumber} created`, order: result });
};
/*
export const nextStep = async (req: Request, res: Response) => {
  const { orderNumber } = req.params;
  const { stepQuantities } = req.body;
  const { id, role } = req.user

  const result = await nextStepService(Number(orderNumber), role, id, stepQuantities);

  return res.status(200).json(result);
}; */
/*
export const createStepLog = async (req: Request, res: Response) => {
  const { orderNumber } = req.params;
  const {stepName, eventType } = req.body
  const { id } = req.user;

  const result = await createStepLogService(Number(orderNumber), id, eventType, stepName)
}*/


export const startStepV2 = async (req: Request, res: Response) => {

  const result =
    await createStepEventV2(
      Number(req.params.orderNumber),
      req.user.id,
      req.user.role,
      'START'
    );

  return res.json(result);
};

export const endStepV2 = async (req: Request, res: Response) => {
  const result =
    await createStepEventV2(
      Number(req.params.orderNumber),
      req.user.id,
      req.user.role,
      'END'
    );

  return res.json(result);
};

export const getVisibleOrdersV2 = async (req: Request, res: Response) => {

  const role = req.user.role;
  const orders = await prisma.order.findMany();
  const result = await Promise.all(

    orders.map(async (order) => {

      const wf = workflow[order.product_type];

      if (!wf) return null;

      const logs = await prisma.step_logs.findMany({
        where: { order_id: order.id },
        orderBy: { created_at: 'asc' }
      });

      const state = buildState(logs, wf);
      const access = roleStatusMap[role];

      if (access.type === 'ALL') {
        return { ...order, state };
      }

      const allowedSteps = access.steps.filter(
        step => wf[step]
      );

      const hasVisibleStep = allowedSteps.some(step => {

        return (
          state[step] === 'ACTIVE' ||
          canStartStep(step, state, wf)
        );
      });

      if (!hasVisibleStep) return null;

      return { ...order, state };
    })
  );

  return res.json(result.filter(Boolean));
};
