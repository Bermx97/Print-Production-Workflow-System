import { Request, Response } from 'express';
import { createOrderService, getOrdersService, getOrderService, getMyOrdersService, nextStepService } from './orders.service';
import { HttpError } from '../../utils/errors';
import prisma from '../../lib/prisma';

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

  return res.status(200).json(order);
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
    number_of_pages: numberOfPages
  }

  const result = await createOrderService(data);
  res.status(201).json({ message: `Order ${orderNumber} created`, order: result });
};

export const nextStep = async (req: Request, res: Response) => {
  const { orderNumber } = req.params;
  const userRole = req.user.role
  const result = await nextStepService(Number(orderNumber), userRole);

  return res.status(200).json(result);
}