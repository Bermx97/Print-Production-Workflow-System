import request from "supertest";
import app from "../../../src/app";
import prisma from "../../../src/lib/prisma";
import { getAuthToken } from '../../utils/auth';


let token: string;

beforeEach(async () => {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "order", "employee" RESTART IDENTITY CASCADE;
  `);
});

it('should create an order and return it', async () => {
    const auth = await getAuthToken();
    token = auth.token;
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

it('should reject the step when missing dependencies', async () => {
  const authAdmin = await getAuthToken();
  const adminToken = authAdmin.token;
  const auth = await getAuthToken('folding_operator');
  const foldingToken = auth.token;
  const orderNumber = Number(Math.floor(Math.random() * 10000));
  const data = { orderNumber, dueDate: new Date('2026-08-01'), productType: 'perfect_bound_book' };

  const createOrder = await request(app)
  .post('/orders')
  .send(data)
  .set("Authorization", `Bearer ${adminToken}`);

  const nextStep = await request(app)
  .post(`/orders/${orderNumber}/nextStep`)
  .set("Authorization", `Bearer ${foldingToken}`);

  expect(nextStep.status).toBe(409);
  expect(nextStep.body.message).toBe('No available steps');
});

it('should allow the step', async () => {
  const authAdmin = await getAuthToken();
  const orderNumber = Number(Math.floor(Math.random() * 10000));

    await prisma.order.create({
      data : {
        order_number: orderNumber, due_date: new Date('2026-08-01') , created_by: authAdmin.user.id, product_type: 'perfect_bound_book', completed_steps: ['printing', 'folding_with_milling']
      }
    });

  const perfectBoundOperator = await getAuthToken('perfect_bound_operator');
  const operatorToken = perfectBoundOperator.token;

  const nextStep = await request(app)
  .post(`/orders/${orderNumber}/nextStep`)
  .set("Authorization", `Bearer ${operatorToken}`);

  const updatedOrder = await prisma.order.findUnique({
    where: { order_number: orderNumber }
  });

  expect(updatedOrder?.completed_steps).toContain('binding');
  
});

it('should reject step when dependencies missing', async () => {
  const authAdmin = await getAuthToken();
  const orderNumber = Number(Math.floor(Math.random() * 10000));

  await prisma.order.create({
        data : {
          order_number: orderNumber, due_date: new Date('2026-08-01') , created_by: authAdmin.user.id, product_type: 'perfect_bound_book', completed_steps: []
        }
    });

  const sewingOperator = await getAuthToken('sewing_operator');
  const sewingOperatorToken = sewingOperator.token
  const nextStep = await request(app)
  .post(`/orders/${orderNumber}/nextStep`)
  .set("Authorization", `Bearer ${sewingOperatorToken}`)
  .expect(409);

  const order = await prisma.order.findUnique({
    where: { order_number: orderNumber }
  });

  expect(order?.completed_steps).toEqual([]);

});

it('should reject the step when step already completed', async () => {
  const authAdmin = await getAuthToken();
  const orderNumber = Number(Math.floor(Math.random() * 10000));

  await prisma.order.create({
      data : {
        order_number: orderNumber, due_date: new Date('2026-08-01') , created_by: authAdmin.user.id, product_type: 'perfect_bound_book', completed_steps: ['printing']
      }
  });

  const printer = await getAuthToken('printer_operator');
  const printerToken = printer.token;

  const nextStep = await request(app)
  .post(`/orders/${orderNumber}/nextStep`)
  .set("Authorization", `Bearer ${printerToken}`);

  expect(nextStep.status).toBe(409);
  expect(nextStep.body.message).toBe('No available steps');
});

it('should allow the step', async () => {
  const authAdmin = await getAuthToken();
  const orderNumber = Number(Math.floor(Math.random() * 10000));

    await prisma.order.create({
      data : {
        order_number: orderNumber, due_date: new Date('2026-08-01') , created_by: authAdmin.user.id, product_type: 'hardcover_book', completed_steps: ['printing', 'folding']
      }
  });

  const caseMaker = await getAuthToken('case_maker');
  const caseMakerToken = caseMaker.token;

  const caseNextStep = await request(app)
  .post(`/orders/${orderNumber}/nextStep`)
  .set("Authorization", `Bearer ${caseMakerToken}`);

  expect(caseNextStep.status).toBe(200);

  let updatedOrder = await prisma.order.findUnique({
    where: { order_number: orderNumber }
  });

  expect(updatedOrder?.completed_steps).toEqual(['printing', 'folding', 'case_making']);

  const sewingOperator = await getAuthToken('sewing_operator');
  const sewingOperatorToken = sewingOperator.token;

  const sawingNextStep = await request(app)
  .post(`/orders/${orderNumber}/nextStep`)
  .set("Authorization", `Bearer ${sewingOperatorToken}`);
  
  expect(sawingNextStep.status).toBe(200);

  updatedOrder = await prisma.order.findUnique({
    where: { order_number: orderNumber }
  });

  expect(updatedOrder?.completed_steps).toEqual(['printing', 'folding', 'case_making', 'sewing']);

  const hardcoverOperator = await getAuthToken('hardcover_binder_operator');
  const hardcoverOperatorToken = hardcoverOperator.token;

  const hardcoverNextStep = await request(app)
  .post(`/orders/${orderNumber}/nextStep`)
  .set("Authorization", `Bearer ${hardcoverOperatorToken}`);

  expect(hardcoverNextStep.status).toBe(200);

  updatedOrder = await prisma.order.findUnique({
    where: { order_number: orderNumber }
  });

  expect(updatedOrder?.completed_steps).toEqual(['printing', 'folding', 'case_making', 'sewing', 'hardcover_binding']);
});
