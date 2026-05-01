import { Request, Response } from 'express';
import { createOrderService, getOrdersService, getOrderService } from './orders.service';
import { HttpError } from '../../utils/errors';
import prisma from '../../lib/prisma';

export const getOrders = async (req: Request, res: Response) => {
    const orders = await getOrdersService();
    return res.status(200).json(orders);
};

//stestuj
export const getOrderByNumber = async (req: Request, res: Response) => {
  const { orderNumber } = req.params;
  const order = await getOrderService(Number(orderNumber));
  if (!order) {
    throw new HttpError('Order not found', 404);
  };
  return res.status(200).json(order);
};

//stestuj
export const createOrder = async (req: Request, res: Response) => {
  const { orderNumber, status, dueDate } = req.body;

  const existing = await prisma.order.findUnique({
    where: { order_number: orderNumber }
  });

  if (existing) {
    throw new HttpError(`Order ${orderNumber} already exists`, 409);
  }

  const data = {
    order_number: Number(orderNumber),
    status,
    due_date: new Date(dueDate),
    createdBy: { connect: { id: req.user.id } }
  }

  const result = await createOrderService(data);
  res.status(201).json({ message: `Order ${orderNumber} created`, order: result });
};