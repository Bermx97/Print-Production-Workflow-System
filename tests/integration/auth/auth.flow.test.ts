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


it('should register and login employee', async () => {
  const { token } = await getAuthToken();
    const employee = {
        login: 'flowTest',
        password: 'flowTest',
        role: 'admin'
    }

    const register = await request(app)
    .post('/auth/register')
    .set("Authorization", `Bearer ${token}`)
    .send(employee);

    expect(register.status).toBe(201);
    expect(register.body.message).toBe(`User ${employee.login} with role ${employee.role} created`);

    const login = await request(app)
    .post('/auth/login')
    .send({
        login: employee.login,
        password: employee.password
    });

    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();
});