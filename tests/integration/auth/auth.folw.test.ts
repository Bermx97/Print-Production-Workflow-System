import request from "supertest";
import app from "../../../src/app";
import prisma from "../../../src/lib/prisma";


beforeEach(async () => {
  await prisma.employee.deleteMany();
});


it('should register and login employee', async () => {
    const employee = {
        login: 'flowTest',
        password: 'flowTest',
        role: 'admin'
    }

    const register = await request(app)
    .post('/auth/register')
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