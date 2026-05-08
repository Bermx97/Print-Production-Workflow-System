import request from 'supertest';
import app from '../../../src/app';
import prisma from '../../../src/lib/prisma';
import { getAuthToken } from '../../utils/auth';
import { createOrder, getRandomQuantity, getRandomClient, getRandomEvenPages } from "../../utils/order";

beforeEach(async () => {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "order", "employee" RESTART IDENTITY CASCADE;
  `);
});

describe('GET /orders/my', () => {
  it('should return only executable orders for role', async () => {
    const {token, user: { id } } = await getAuthToken('folding_operator');

    await createOrder('hardcover_book');
    const { order_number } = await createOrder('hardcover_book', ['printing'])

    const response = await request(app)
      .get('/orders/my')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].order_number).toBe(order_number);
  });
});

describe('GET /orders', () => {
  it('should return 200 if orders exist', async () => {
    const { token } = await getAuthToken();
    const response = await request(app)
    .get('/orders')
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
    const { order_number } = await createOrder('hardcover_book');

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
      number_of_pages: getRandomEvenPages()
    })
    .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Order number must be a number');
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
      number_of_pages: getRandomEvenPages()
    })
    .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Due date must be a valid date');
  });

  it('should return 400 if productType is invalid', async () => {
  const { token, user: { id } } = await getAuthToken()
  const response = await request(app)
  .post('/orders')
  .send({
    orderNumber: 14452,
    dueDate: '2026-08-01',
    createdBy: id,
    productType: 'invalid type',
    quantity: getRandomQuantity(),
    customer: getRandomClient(),
    number_of_pages: getRandomEvenPages()
  })
  .set("Authorization", `Bearer ${token}`);
  
  expect(response.status).toBe(400);
  expect(response.body.message).toBe('Invalid product type');
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
      number_of_pages: getRandomEvenPages()
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Not authorized');
    });

  it('should return 409 if order already exists', async () => {
    const { token } = await getAuthToken();
    const orderNumber = Number(Math.floor(Math.random() * 10000));
    const data = { orderNumber, dueDate: new Date('2026-08-01'), productType: 'hardcover_book', quantity: getRandomQuantity(), customer: getRandomClient(), numberOfPages: getRandomEvenPages() };

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
    const data = {orderNumber, dueDate: new Date("2026-08-01"), productType: 'hardcover_book', quantity: getRandomQuantity(), customer: getRandomClient(), numberOfPages: getRandomEvenPages() }

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