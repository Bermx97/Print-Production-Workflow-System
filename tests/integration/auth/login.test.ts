import request from "supertest";
import app from "../../../src/app";
import prisma from "../../../src/lib/prisma";
import bcrypt from 'bcrypt';


beforeEach(async () => {
  await prisma.employee.deleteMany();

  await prisma.employee.create({
    data : {
      login: 'loginTest',
      hashed_password: await bcrypt.hash('password', 10),
      role: 'admin'
    }
  })
});

describe('POST /auth/login', () => {
    it('should return 400 if the login is empty', async () => {
        const response = await request(app)
        .post('/auth/login')
        .send({
            login:'',
            password:'password',
        });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Login is required');
    });

    it('should return 400 if the password is empty', async () => {
        const response = await request(app)
        .post('/auth/login')
        .send({
            login:'loginTest',
            password:'',
        });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Password is required');
        });

    it('should return 401 if the login is incorrect', async () => {
        const response = await request(app)
        .post('/auth/login')
        .send({
            login: 'incorrectLogin',
            password: 'password',
            role: 'admin'
        });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 401 if the password is incorrect', async () => {
        const response = await request(app)
        .post('/auth/login')
        .send({
            login: 'loginTest',
            password: 'incorrectPassword',
            role: 'admin'
        });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Invalid credentials');
    });

    it('returns 200 if login was successful', async () => {
        const response = await request(app)
        .post('/auth/login')
        .send({
            login: 'loginTest',
            password: 'password',
            role: 'admin'
        });

        expect(response.status).toBe(200);
        expect(response.body.token).toBeTruthy();
    });
});