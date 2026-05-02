import prisma from '../../lib/prisma';
import { Prisma } from '@prisma/client';
type CreateOrderData = Prisma.orderCreateInput;

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
    return await prisma.order.findUnique({
        where: {
            order_number: orderNumber
        }
    });
};

export const createOrderService = async (data: CreateOrderData) => {
    return await prisma.order.create({
        data
    });
};