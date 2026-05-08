import { order, product_type } from '@prisma/client';
import { getAuthToken } from './auth';
import prisma from '../../src/lib/prisma'
type orderSteps = order['completed_steps']

export function getRandomQuantity() {
  const min = 400;
  const max = 30000;

  const steps = (max - min) / 50;

  return (Math.floor(Math.random() * (steps + 1)) * 50) + min;
};

export function getRandomEvenPages() {
  const min = 10;
  const max = 500;

  const value = Math.floor(Math.random() * ((max - min) / 2 + 1)) * 2 + min;

  return value;
};

const clients = [
  'Oslo Publishing House',
  'Bergen Media Group',
  'Scandinavian Print Co',
  'Nordic Books Ltd',
  'Arctic Press',
  'Nova Publishing',
  'Capital Print Studio',
  'Blue Ocean Media'
];

export function getRandomClient() {
  return clients[Math.floor(Math.random() * clients.length)];
}

export const createOrder = async (productType: product_type, completedSteps: orderSteps = []) => {
    const user = await getAuthToken();
    const orderNumber = Number(`${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`)

    const data = { order_number: orderNumber, due_date: new Date('2026-08-01'), created_by: user.user.id, product_type: productType, completed_steps: completedSteps, quantity: getRandomQuantity(), customer: getRandomClient(), number_of_pages: getRandomEvenPages() };

    const order = await prisma.order.create({data});
    return order;
}