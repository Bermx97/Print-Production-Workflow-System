import { order, product_type } from '@prisma/client';
import { getAuthToken } from './auth';
import prisma from '../../src/lib/prisma'
type orderSteps = order['completed_steps']

export const createOrder = async (productType: product_type, completedSteps: orderSteps = []) => {
    const user = await getAuthToken();
    const orderNumber = Number(`${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`)

    const data = { order_number: orderNumber, due_date: new Date('2026-08-01'), created_by: user.user.id, product_type: productType, completed_steps: completedSteps };

    const order = await prisma.order.create({data});
    return order;
}