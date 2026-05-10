import { Request, Response } from 'express';
import { createOrderService, getOrdersService, getOrderService, getMyOrdersService, nextStepService, createStepLogService } from './orders.service';
import { HttpError } from '../../utils/errors';
import prisma from '../../lib/prisma';
import { getWorkflow } from './orders.workflow';

export const getOrders = async (req: Request, res: Response) => {
  const orders = await getOrdersService();
  return res.status(200).json(orders);
};

export const getMyOrders = async (req: Request, res: Response) => {
  const userRole = req.user.role;

  const orders = await getMyOrdersService(userRole);

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

export const nextStep = async (req: Request, res: Response) => {
  const { orderNumber } = req.params;
  const { stepQuantities } = req.body;
  const { id, role } = req.user

  const result = await nextStepService(Number(orderNumber), role, id, stepQuantities);

  return res.status(200).json(result);
};

export const createStepLog = async (req: Request, res: Response) => {
  const { orderNumber } = req.params;
  const {stepName, eventType } = req.body
  const { id } = req.user;

  const result = await createStepLogService(Number(orderNumber), id, eventType, stepName)
}
