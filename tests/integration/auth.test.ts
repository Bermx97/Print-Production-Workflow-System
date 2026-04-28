import request from "supertest";
import app from "../../src/app";
import prisma from "../../src/lib/prisma";


beforeEach(async () => {
  await prisma.employee.deleteMany();
});

describe('POST auth/register', () => {
  it('should return 400 if the login is empty', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        login:'',
        password:'admin123',
        role: 'admin'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Login is required');
  });

  it('should return 400 if the password is empty', async () => {
  const response = await request(app)
    .post('/auth/register')
    .send({
      login:'Admin1',
      password:'',
      role: 'admin'
    });

  expect(response.status).toBe(400);
  expect(response.body.message).toBe('Password is required');
  });

  it('should return 400 if the role is empty', async () => {
  const response = await request(app)
    .post('/auth/register')
    .send({
      login:'Admin1',
      password:'Adminpass',
      role: ''
    });

  expect(response.status).toBe(400);
  expect(response.body.message).toBe('Role is required');
  });
});


