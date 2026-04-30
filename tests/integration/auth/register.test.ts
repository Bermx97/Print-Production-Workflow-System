import request from "supertest";
import app from "../../../src/app";
import prisma from "../../../src/lib/prisma";


beforeEach(async () => {
  await prisma.employee.deleteMany();

  await prisma.employee.create({
    data : {
      login: 'Test409',
      hashed_password: 'Test409',
      role: 'admin'
    }
  })
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

  it('should return 409 if the login already exists', async () => {
    const response = await request(app)
    .post('/auth/register')
    .send({
      login: 'Test409',
      password: 'Test 409',
      role: 'admin'
    });

  expect(response.status).toBe(409);
  expect(response.body.message).toBe('Employee already exist');
  });

  it('should return 201 if the employee was successfully added', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        login: 'Test201',
        password: 'Test 201',
        role: 'admin'
      });
    expect(response.status).toBe(201);
    expect(response.body.message).toBe(`User Test201 with role admin created`);
    });
});


