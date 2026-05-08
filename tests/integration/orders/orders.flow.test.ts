import request from "supertest";
import app from "../../../src/app";
import prisma from "../../../src/lib/prisma";
import { getAuthToken } from '../../utils/auth';
import { createOrder } from "../../utils/order";

beforeEach(async () => {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "order", "employee" RESTART IDENTITY CASCADE;
  `);
});

it('should create an order and return it', async () => {
    const { token, user: {id} } = await getAuthToken();
    const orderNumber = Number(Math.floor(Math.random() * 10000));
    const data = { orderNumber, dueDate: new Date('2026-08-01'), productType: 'hardcover_book' };

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

it('should reject the step when missing dependencies', async () => {
  const { token } = await getAuthToken('folding_operator');
  const { order_number } = await createOrder('hardcover_book');

  const nextStep = await request(app)
  .post(`/orders/${order_number}/nextStep`)
  .set("Authorization", `Bearer ${token}`);

  expect(nextStep.status).toBe(409);
  expect(nextStep.body.message).toBe('No available steps');
});

it('should allow the step', async () => {
  const { order_number } = await createOrder('perfect_bound_book', ['printing', 'folding_with_milling']);
  const { token } = await getAuthToken('perfect_bound_operator');

  const nextStep = await request(app)
  .post(`/orders/${order_number}/nextStep`)
  .set("Authorization", `Bearer ${token}`);

  const updatedOrder = await prisma.order.findUnique({
    where: { order_number: order_number }
  });

  expect(updatedOrder?.completed_steps).toContain('binding');
});

it('should reject step when dependencies missing', async () => {
  const { order_number } = await createOrder('perfect_bound_book');

  const { token } = await getAuthToken('sewing_operator');
  const nextStep = await request(app)
  .post(`/orders/${order_number}/nextStep`)
  .set("Authorization", `Bearer ${token}`)
  .expect(409);

  const order = await prisma.order.findUnique({
    where: { order_number: order_number }
  });

  expect(order?.completed_steps).toEqual([]);
});

it('should reject the step when step already completed', async () => {
  const { order_number } = await createOrder('perfect_bound_book', ['printing']);
  const { token }= await getAuthToken('printer_operator');

  const nextStep = await request(app)
  .post(`/orders/${order_number}/nextStep`)
  .set("Authorization", `Bearer ${token}`);

  expect(nextStep.status).toBe(409);
  expect(nextStep.body.message).toBe('No available steps');
});

it('should allow the step', async () => {
  const { order_number } = await createOrder('hardcover_book', ['printing', 'folding']);
  const { token: caseMakerToken } = await getAuthToken('case_maker');

  const caseNextStep = await request(app)
  .post(`/orders/${order_number}/nextStep`)
  .set("Authorization", `Bearer ${caseMakerToken}`);

  expect(caseNextStep.status).toBe(200);

  let updatedOrder = await prisma.order.findUnique({
    where: { order_number: order_number}
  });

  expect(updatedOrder?.completed_steps).toEqual(['printing', 'folding', 'case_making']);

  const { token: sewingOperatorToken } = await getAuthToken('sewing_operator');

  const sawingNextStep = await request(app)
  .post(`/orders/${order_number}/nextStep`)
  .set("Authorization", `Bearer ${sewingOperatorToken}`);
  
  expect(sawingNextStep.status).toBe(200);

  updatedOrder = await prisma.order.findUnique({
    where: { order_number: order_number }
  });

  expect(updatedOrder?.completed_steps).toEqual(['printing', 'folding', 'case_making', 'sewing']);

  const { token: hardcoverOperatorToken } = await getAuthToken('hardcover_binder_operator');

  const hardcoverNextStep = await request(app)
  .post(`/orders/${order_number}/nextStep`)
  .set("Authorization", `Bearer ${hardcoverOperatorToken}`);

  expect(hardcoverNextStep.status).toBe(200);

  updatedOrder = await prisma.order.findUnique({
    where: { order_number: order_number }
  });

  expect(updatedOrder?.completed_steps).toEqual(['printing', 'folding', 'case_making', 'sewing', 'hardcover_binding']);
});
