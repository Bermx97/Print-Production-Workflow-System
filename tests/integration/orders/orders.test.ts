import { expect, test, describe, it, beforeEach } from "@jest/globals";
import request from 'supertest';
import app from '../../../src/app';
import prisma from '../../../src/lib/prisma';
import { getAuthToken } from '../../utils/auth';
import { createOrder, getRandomQuantity, getRandomClient, getRandomEvenPages, getRandomVariant, getRandomRun, getRandomParts } from "../../utils/order";
let parts = getRandomParts()

beforeEach(async () => {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "order", "employee" RESTART IDENTITY CASCADE;
  `);
});

describe('GET /orders', () => {
  it('should return 200 if orders exist', async () => {
    await createOrder('perfect_bound_book')
    const { token } = await getAuthToken();
    const response = await request(app)
    .get('/')
    .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
  });

  it('should return 401 if user is not logged', async () => {
    const response = await request(app)
    .get('/orders');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Not authorized');
  });
});

describe('GET /orders/:orderNumber', () => {

  it('should return 404 if order not found', async () => {
    const { token } = await getAuthToken();
    const response = await request(app)
    .get('/orders/10')
    .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Order not found');
  });

  it('should return 401 if user is not logged', async () => {
    const response = await request(app)
    .get('/orders/1');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Not authorized');
  });

  it('should return 200 and the searched order if it exists', async () => {
    const { token } = await getAuthToken()
    const { order: {order_number} } = await createOrder('hardcover_book');

    const response = await request(app)
    .get(`/orders/${order_number}`)
    .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      order_number: order_number,
    });
  });
});

describe('POST /orders', () => {
  it('should return 400 if the orderNumber is empty', async () => {
    const { token } = await getAuthToken()
    const response = await request(app)
    .post('/orders')
    .send({
      orderNumber: '',
      dueDate: new Date('2026-08-01'),
      createdBy: '',
      productType: 'hardcover_book',
      quantity: getRandomQuantity(),
      customer: getRandomClient(),
      numberOfPages: getRandomEvenPages(),
      parts
    })
    .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid order number');
});

  it('should return 400 if the date is not a date', async () => {
    const { token } = await getAuthToken()
    const response = await request(app)
    .post('/orders')
    .send({
      orderNumber: 14452,
      dueDate: '20',
      createdBy: '',
      productType: 'hardcover_book',
      quantity: getRandomQuantity(),
      customer: getRandomClient(),
      numberOfPages: getRandomEvenPages(),
      parts
    })
    .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Due date must be a valid date');
  });

  it('should return 400 if productType is invalid', async () => {
  const { token, user: { id } } = await getAuthToken();
  const response = await request(app)
  .post('/orders')
  .send({
    orderNumber: 14452,
    dueDate: '2026-08-01',
    createdBy: id,
    productType: 'invalid type',
    quantity: getRandomQuantity(),
    customer: getRandomClient(),
    numberOfPages: getRandomEvenPages(),
    parts
  })
  .set("Authorization", `Bearer ${token}`);
  
  expect(response.status).toBe(400);
  expect(response.body.message).toBe('Invalid product type');
  });

  it('should return 400 if quantity is empty', async () => {
  const { token, user: { id } } = await getAuthToken();
  const response = await request(app)
  .post('/orders')
  .send({
    orderNumber: 14452,
    dueDate: '2026-08-01',
    createdBy: id,
    productType: 'hardcover_book',

    customer: getRandomClient(),
    numberOfPages: getRandomEvenPages(),
    parts
  })
  .set("Authorization", `Bearer ${token}`);
  
  expect(response.status).toBe(400);
  expect(response.body.message).toBe('Quantity is required');
  });

  it('should return 400 if customer is empty', async () => {
  const { token, user: { id } } = await getAuthToken();
  const response = await request(app)
  .post('/orders')
  .send({
    orderNumber: 14452,
    dueDate: '2026-08-01',
    createdBy: id,
    productType: 'hardcover_book',
    quantity: getRandomQuantity(),

    numberOfPages: getRandomEvenPages(),
    parts
  })
  .set("Authorization", `Bearer ${token}`);
  
  expect(response.status).toBe(400);
  expect(response.body.message).toBe('Customer is required');
  });

  it('should return 400 if number of pages is not even', async () => {
  const { token, user: { id } } = await getAuthToken();
  const response = await request(app)
  .post('/orders')
  .send({
    orderNumber: 14452,
    dueDate: '2026-08-01',
    createdBy: id,
    productType: 'hardcover_book',
    quantity: getRandomQuantity(),
    customer: getRandomClient(),
    numberOfPages: 201,
    parts
  })
  .set("Authorization", `Bearer ${token}`);
  
  expect(response.status).toBe(400);
  expect(response.body.message).toBe('Number of pages must be even');
  });

  it('should return 400 if parts is not between 1 and 7 parts', async () => {
  const { token, user: { id } } = await getAuthToken();
  const parts = [{},{},{},{},{},{},{},{}]
  const response = await request(app)
  .post('/orders')
  .send({
    orderNumber: 14452,
    dueDate: '2026-08-01',
    createdBy: id,
    productType: 'hardcover_book',
    quantity: getRandomQuantity(),
    customer: getRandomClient(),
    numberOfPages: getRandomEvenPages(),
    parts
  })
  .set("Authorization", `Bearer ${token}`);
  
  expect(response.status).toBe(400);
  expect(response.body.message).toBe('You can add between 1 and 7 parts per order');
  });

  it('should return 400 if variant is not one of: V4, V8, V16, V24, V32, V64, COVER', async () => {
  const { token, user: { id } } = await getAuthToken();
  const parts = [{ variant: 'wrongVariant', runs: getRandomRun(), part_quantity: getRandomQuantity() }]
 
  const response = await request(app)
  .post('/orders')
  .send({
    orderNumber: 14452,
    dueDate: '2026-08-01',
    createdBy: id,
    productType: 'hardcover_book',
    quantity: getRandomQuantity(),
    customer: getRandomClient(),
    numberOfPages: getRandomEvenPages(),
    parts
  })
  .set("Authorization", `Bearer ${token}`);
  
  expect(response.status).toBe(400);
  expect(response.body.message).toBe('variant must be one of: V4, V8, V16, V24, V32, V64, COVER');
  });

  it('should return 400 if runs are not between 1 and 100', async () => {
  const { token, user: { id } } = await getAuthToken();
  const parts = [{ variant: getRandomVariant(), runs: 101, part_quantity: getRandomQuantity() }]
 
  const response = await request(app)
  .post('/orders')
  .send({
    orderNumber: 14452,
    dueDate: '2026-08-01',
    createdBy: id,
    productType: 'hardcover_book',
    quantity: getRandomQuantity(),
    customer: getRandomClient(),
    numberOfPages: getRandomEvenPages(),
    parts
  })
  .set("Authorization", `Bearer ${token}`);
  
  expect(response.status).toBe(400);
  expect(response.body.message).toBe('Signatures must be between 1 and 100');
  });

  it('should return 400 if part quantity is not between 1 and 1000000', async () => {
  const { token, user: { id } } = await getAuthToken();
  const parts = [{ variant: getRandomVariant(), runs: getRandomRun(), part_quantity: -1 }]
 
  const response = await request(app)
  .post('/orders')
  .send({
    orderNumber: 14452,
    dueDate: '2026-08-01',
    createdBy: id,
    productType: 'hardcover_book',
    quantity: getRandomQuantity(),
    customer: getRandomClient(),
    numberOfPages: getRandomEvenPages(),
    parts
  })
  .set("Authorization", `Bearer ${token}`);
  
  expect(response.status).toBe(400);
  expect(response.body.message).toBe('Part quantity must be between 1 and 1000000');
  });

  it('should return 401 if user is not logged', async () => {
    const response = await request(app)
    .post('/orders')
    .send({
      orderNumber: 14452,
      dueDate: '2026-08-01',
      createdBy: '',
      productType: 'hardcover_book',
      quantity: getRandomQuantity(),
      customer: getRandomClient(),
      numberOfPages: getRandomEvenPages(),
      parts
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Not authorized');
    });

  it('should return 409 if order already exists', async () => {
    const { token } = await getAuthToken();
    const orderNumber = Number(Math.floor(Math.random() * 10000));
    const data = { orderNumber, dueDate: new Date('2026-08-01'), productType: 'hardcover_book', quantity: getRandomQuantity(), customer: getRandomClient(), numberOfPages: getRandomEvenPages(), parts };

    await request(app)
    .post('/orders')
    .send(data)
    .set("Authorization", `Bearer ${token}`);

    const response = await request(app)
    .post('/orders')
    .send(data)
    .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(409);
    expect(response.body.message).toBe(`Order ${orderNumber} already exists`);
  });

  it('should return 201 if the addition was successful', async () => {
    const { token, user: { id } } = await getAuthToken();
 
    const orderNumber = Number(Math.floor(Math.random() * 10000));
    const data = {orderNumber, dueDate: new Date("2026-08-01"), productType: 'hardcover_book', quantity: getRandomQuantity(), customer: getRandomClient(), numberOfPages: getRandomEvenPages(), parts }

    const response = await request(app)
    .post('/orders')
    .send(data)
    .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      message: `Order ${orderNumber} created`, order: {
        order_number: data.orderNumber,
        created_by: id
      }
    });
  });
});
