import { Request, Response } from 'express';
import { createOrderService, getOrdersService, getOrderService, getMyOrdersService, updateOrderStatusService } from './orders.service';
import { HttpError } from '../../utils/errors';
import prisma from '../../lib/prisma';
import  { roleStatusMap }  from '../orders/orders.workflow';
import { Prisma } from '@prisma/client';
import { order_status } from '@prisma/client';

export const getOrders = async (req: Request, res: Response) => {
  const orders = await getOrdersService();
  return res.status(200).json(orders);
};

export const getMyOrders = async (req: Request, res: Response) => {
  const { status } = req.query;
  const userRole = req.user.role;
  const allowedStatuses = roleStatusMap[userRole];

  const where: Prisma.orderWhereInput  = {
  status: {
    in: allowedStatuses,
  },
};

  const orders = await getMyOrdersService(where);
  return res.status(200).json(orders);
};

export const getOrderByNumber = async (req: Request, res: Response) => {
  const { orderNumber } = req.params;
  const order = await getOrderService(Number(orderNumber));

  return res.status(200).json(order);
};

export const createOrder = async (req: Request, res: Response) => {
  const { orderNumber, dueDate } = req.body;
  const status = order_status.printing;
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

export const updateOrderStatus = async (req: Request, res: Response) => {
  const { orderNumber } = req.params;
  const userRole = req.user.role
  const result = await updateOrderStatusService(Number(orderNumber), userRole);

  return res.status(200).json(result);
}