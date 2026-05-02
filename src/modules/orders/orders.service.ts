import prisma from '../../lib/prisma';
import { Prisma } from '@prisma/client';
type CreateOrderData = Prisma.orderCreateInput;
import { HttpError } from '../../utils/errors';
import { order_status, employee_role } from '@prisma/client';
import { nextStatusMap, roleStatusMap } from './orders.workflow';


export const getOrdersService = async () => {
    return await prisma.order.findMany({
        orderBy: { due_date: 'asc' }
    });
};

export const getMyOrdersService = async (where: Prisma.orderWhereInput) => {
    return await prisma.order.findMany({
        where, orderBy: { due_date: 'asc' }
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
    return await prisma.order.create({
        data
    });
};

export const updateOrderStatusService = async (orderNumber: number, userRole: employee_role) => {
    const order = await getOrderService(orderNumber);
    
    const allowedStatuses = roleStatusMap[userRole];

    if (!allowedStatuses.includes(order.status)) {
        throw new HttpError('You do not have permission to perform this action', 403);
    }
    
    const nextStatus = nextStatusMap[order.status as keyof typeof nextStatusMap];

    if (!nextStatus) {
        throw new HttpError('No further status transition available', 409);
    }

    return await prisma.order.update({
        where: { order_number: orderNumber },
        data: { status: nextStatus }
    });
};