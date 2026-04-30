import request from 'supertest';
import app from '../../../src/app';
import prisma from '../../../src/lib/prisma';
import { getAuthToken } from '../../utils/auth';


let token: string;

beforeEach(async () => {
  await prisma.employee.deleteMany();
});

describe('/GET/orders', () => {
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

/*

describe('GET/orders/:orderNumber', () => {
  it('should return 200 and the searched order if it exists', async () => {

    const employee = await prisma.employee.create({
      data : {
      login: 'createOrderTest',
      hashed_password: 'createOrderTest',
      role: 'admin'
    }
  })
    const dueDate = new Date();  dueDate.setDate(dueDate.getDate() + 14);

    await prisma.order.create({
      data : {
        order_number: 100,
        status: 'printing',
        due_date: dueDate,
        assignedTo: employee.id
      ? {
          connect: { id: employee.id }
        }
      : undefined,
        createdBy: {
        connect: { id: employee.id }
}
      }
    })
    const auth = await getAuthToken();
    token = auth.token;
    const response = await request(app)
    .get('/orders/100')
    .set("Authorization", `Bearer ${token}`)

    expect(response.status).toBe(200);
    await prisma.$executeRawUnsafe(`
  TRUNCATE TABLE "order", "employee" RESTART IDENTITY CASCADE;
`);
  }) 

}) */