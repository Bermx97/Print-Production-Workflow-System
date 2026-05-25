import { order, product_type } from '@prisma/client';
import { getAuthToken } from './auth';
import prisma from '../../src/lib/prisma'
import { workflow } from '../../src/modules/orders/orders.workflow';
import { Variant } from '@prisma/client';

const variants = Object.values(Variant)

const getRandomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export function getRandomParts() {
  const count = getRandomInt(1, 6);
  const parts = Array.from({ length: count }, () => ({
    variant: getRandomVariant(),
    runs: getRandomRun(),
    part_quantity: getRandomQuantity()
  }));
  return parts
}

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

export function getRandomVariant() {
  return variants[Math.floor(Math.random() * variants.length)]
}

export function getRandomRun() {
  return Math.floor(Math.random() * 10) + 1;
}

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

export const createOrder = async (productType: product_type) => {
    const user = await getAuthToken();
    const orderNumber = Number(`${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`)

    const data = { order_number: orderNumber, due_date: new Date('2026-08-01'), created_by: user.user.id, product_type: productType, quantity: getRandomQuantity(), customer: getRandomClient(), number_of_pages: getRandomEvenPages() };
    const parts = getRandomParts()
    const order = await prisma.order.create({ data });
    await prisma.order_parts.createMany({
      data: parts.map(part => ({
        ...part,
        order_id: order.id
      }))
    });
    const createdParts = await prisma.order_parts.findMany({
      where: {
        order_id: order.id
      }
  }); return { order, parts: createdParts }
}
