import { expect, test, describe, it, beforeEach } from "@jest/globals";
import request from "supertest";
import app from "../../../src/app";
import prisma from "../../../src/lib/prisma";
import { getAuthToken } from '../../utils/auth';
import { createOrder, getRandomClient, getRandomEvenPages, getRandomQuantity, getRandomParts } from "../../utils/order";
let parts = getRandomParts()

beforeEach(async () => {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "order", "employee" RESTART IDENTITY CASCADE;
  `);
});

it('should create an order and return it', async () => {
    const { token, user: { id } } = await getAuthToken();
    const orderNumber = Number(Math.floor(Math.random() * 10000));
    const data = { orderNumber, dueDate: new Date('2026-08-01'), productType: 'hardcover_book', customer: getRandomClient(),quantity: getRandomQuantity(), numberOfPages: getRandomEvenPages(), parts };

    const createOrder = await request(app)
    .post('/orders')
    .send(data)
    .set("Authorization", `Bearer ${token}`);

    expect(createOrder.status).toBe(201);
    expect(createOrder.body).toMatchObject({
      message: `Order ${orderNumber} created`, order: {
        order_number: data.orderNumber,
        created_by: id
      }
    });

    const findOrder = await request(app)
    .get(`/orders/${orderNumber}`)
    .set("Authorization", `Bearer ${token}`);

    expect(findOrder.status).toBe(200);
    expect(findOrder.body).toMatchObject({
      order_number: orderNumber,
      created_by: id
    });
});
