import request from 'supertest';
import app from '../../../src/app';
import prisma from '../../../src/lib/prisma';
import { getAuthToken } from '../../utils/auth';
import { order_status } from '@prisma/client';
import  { roleStatusMap }  from '../../../src/utils/roleStatusMap';

let token: string;

beforeEach(async () => {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "order", "employee" RESTART IDENTITY CASCADE;
  `);
});

describe('GET /orders/my', () => {
  it('should return only allowed orders', async () => {
    const auth = await getAuthToken('gluer');
    token = auth.token;
    await prisma.order.createMany({
      data: [
        {
          order_number: 1,
          status: 'printing',
          due_date: new Date('2026-08-01'),
          created_by: auth.user.id,
        },
        {
          order_number: 2,
          status: 'cutting',
          due_date: new Date('2026-08-01'),
          created_by: auth.user.id,
        },
        {
          order_number: 3,
          status: 'gluing',
          due_date: new Date('2026-08-01'),
          created_by: auth.user.id,
        },
        {
          order_number: 4,
          status: 'gluing',
          due_date: new Date('2026-08-01'),
          created_by: auth.user.id,
        },
      ],
    });
    const response = await request(app)
        .get('/orders/my')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);

      const returnedStatuses = response.body.map(
        (o: any) => o.status
      );

      const allowedStatuses = roleStatusMap[auth.user.role];

      expect(returnedStatuses.every((s: string) =>
        allowedStatuses.includes(s as any)
      )).toBe(true);
    });
  });


describe('GET /orders', () => {
  it('should return 200 if orders exist', async () => {
    const auth = await getAuthToken();
    token = auth.token;
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
    const auth = await getAuthToken();
    token = auth.token
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
  })

  it('should return 200 and the searched order if it exists', async () => {
    const auth = await getAuthToken();
    token = auth.token
    await prisma.order.create({
      data : {
        order_number: 100, status: order_status.printing, due_date: new Date('2026-08-01') , created_by: auth.user.id
      }
    });

    const response = await request(app)
    .get('/orders/100')
    .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      order_number: 100,
      status: order_status.printing,
      created_by: auth.user.id
    });
  });
});

describe('POST /orders', () => {

  it('should return 400 if the orderNumber is empty', async () => {
        const response = await request(app)
        .post('/orders')
        .send({
          orderNumber: '',
          status: order_status.printing,
          dueDate: new Date('2026-08-01'),
          createdBy: ''
        });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('orderNumber must be a number');
    });

  it('should return 400 if the status is wrong', async () => {
      const response = await request(app)
      .post('/orders')
      .send({
        orderNumber: 14452,
        status: 'wrongStatus',
        dueDate: new Date('2026-08-01'),
        createdBy: ''
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid status');
  });

  it('should return 400 if the date is not a date', async () => {
    const response = await request(app)
    .post('/orders')
    .send({
      orderNumber: 14452,
      status: order_status.printing,
      dueDate: '20',
      createdBy: ''
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('dueDate must be a valid date');
  });

  it('should return 401 if user is not logged', async () => {
    const response = await request(app)
    .post('/orders')
    .send({
      orderNumber: 14452,
      status: order_status.printing,
      dueDate: '2026-08-01',
      createdBy: ''
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Not authorized');
    });

  it('should return 409 if order already exists', async () => {
    const auth = await getAuthToken();
    token = auth.token;
    const orderNumber = Number(Math.floor(Math.random() * 10000));
    const data = { orderNumber, status: order_status.printing, dueDate: new Date('2026-08-01') };

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
    const auth = await getAuthToken();
    token = auth.token;
    const orderNumber = Number(Math.floor(Math.random() * 10000));
    const data = {orderNumber, status: order_status.printing, dueDate: new Date("2026-08-01") }

    const response = await request(app)
    .post('/orders')
    .send(data)
    .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      message: `Order ${orderNumber} created`, order: {
        order_number: data.orderNumber,
        status: data.status,
        created_by: auth.user.id
      }
    });
  });
});