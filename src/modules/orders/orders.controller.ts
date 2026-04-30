import { Request, Response } from 'express';
import { createOrderService, getOrdersService, getOrderService } from './orders.service';
import { HttpError } from '../../utils/errors';
import { randomInt } from 'crypto';




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

export const createOrder = async (req: Request, res: Response) => {
    const base = Date.now() % 1000000; const 
    orderNumber: number = base * 1000 + randomInt(100, 999);

    const status = 'gluing'

    const dueDate = new Date();  dueDate.setDate(dueDate.getDate() + 14); //to we froncie będziemy wrzucać

    const assignedTo = '28d46871-3645-44e9-abed-deaa5ef80d35'  //to najprawdopodobniej wyrzucimy żeby wyświetlać tylko na komputerach działowych
    const createBy = req.user.id 

    const result = await createOrderService({
        order_number: orderNumber,
        status: status,
        due_date: dueDate,
        assignedTo: assignedTo
      ? {
          connect: { id: assignedTo }
        }
      : undefined,
        createdBy: {
        connect: { id: createBy }
}
    })
      res.status(201).json({ message: `Order created` });
}