import { expect, test, describe, it, beforeEach } from "@jest/globals";
import request from "supertest";
import app from "../../../src/app";
import prisma from "../../../src/lib/prisma";
import { getAuthToken } from "../../utils/auth";


beforeEach(async () => {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "order", "employee" RESTART IDENTITY CASCADE;
  `);
});

describe('POST auth/register', () => {
  
  it('should return 401 if the user is not authenticated', async () => {
  const response = await request(app)
    .post('/auth/register')
    .send({
      login: 'newEmployee',
      password: 'password123',
      role: 'printer_operator'
    });

  expect(response.status).toBe(401);
});

  it('should return 403 if the user is not an admin', async () => {
    const { token } = await getAuthToken('printer_operator');

    const response = await request(app)
      .post('/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({
        login: 'newEmployee',
        password: 'password123',
        role: 'printer_operator'
      });

    expect(response.status).toBe(403);
  });

  it('should return 400 if the login is empty', async () => {
    const { token } = await getAuthToken();
    const response = await request(app)
      .post('/auth/register')
      .set("Authorization", `Bearer ${token}`)
      .send({
        login:'',
        password:'admin123',
        role: 'admin'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Login is required');
  });

  it('should return 400 if the password is empty', async () => {
    const { token } = await getAuthToken();
    const response = await request(app)
      .post('/auth/register')
      .set("Authorization", `Bearer ${token}`)
      .send({
        login:'Admin1',
        password:'',
        role: 'admin'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Password is required');
    });

  it('should return 400 if the role is empty', async () => {
    const { token } = await getAuthToken();
    const response = await request(app)
      .post('/auth/register')
      .set("Authorization", `Bearer ${token}`)
      .send({
        login:'Admin1',
        password:'Adminpass',
        role: ''
      });
        
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Role is required');
    });

  it('should return 409 if the login already exists', async () => {
    const { token, user: {login} } = await getAuthToken();
    //const { user: {login} } = await getAuthToken();
    const response = await request(app)
    .post('/auth/register')
    .set("Authorization", `Bearer ${token}`)
    .send({
      login: login,
      password: 'Test 409',
      role: 'admin'
    });

  expect(response.status).toBe(409);
  expect(response.body.message).toBe('Employee already exist');
  });

  it('should return 201 if the employee was successfully added', async () => {
    const { token } = await getAuthToken();
    const response = await request(app)
      .post('/auth/register')
      .set("Authorization", `Bearer ${token}`)
      .send({
        login: 'Test201',
        password: 'Test 201',
        role: 'admin'
      });
    expect(response.status).toBe(201);
    expect(response.body.message).toBe(`User Test201 with role admin created`);
    });
});


