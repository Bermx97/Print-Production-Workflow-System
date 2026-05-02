import request from "supertest";
import app from "../../../src/app";
import prisma from "../../../src/lib/prisma";
import { getAuthToken } from '../../utils/auth';
import { order_status } from '@prisma/client';

let token: string;

beforeEach(async () => {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "order", "employee" RESTART IDENTITY CASCADE;
  `);
});

it('should create order and find it', async () => {

    const auth = await getAuthToken();
    token = auth.token;
    const orderNumber = Number(Math.floor(Math.random() * 10000));
    const data = { orderNumber, dueDate: new Date('2026-08-01') };

    const createOrder = await request(app)
    .post('/orders')
    .send(data)
    .set("Authorization", `Bearer ${token}`);

    expect(createOrder.status).toBe(201);
    expect(createOrder.body).toMatchObject({
      message: `Order ${orderNumber} created`, order: {
        order_number: data.orderNumber,
        created_by: auth.user.id
      }
    });

    const findOrder = await request(app)
    .get(`/orders/${orderNumber}`)
    .set("Authorization", `Bearer ${token}`);

    expect(findOrder.status).toBe(200);
    expect(findOrder.body).toMatchObject({
      order_number: orderNumber,
      created_by: auth.user.id
    });
});
