import request from 'supertest';
import app from '../../src/app';
import { employee_role } from '@prisma/client';
import bcrypt from 'bcrypt';
import prisma from '../../src/lib/prisma';


type AuthResponse = {
  token: string;
  user: {
    id: string;
    role: employee_role;
    login: string;
  };
};

export const getAuthToken = async (role: employee_role = 'admin') => {
  const uniqueLogin = `user_${Date.now()}`;
  const hashedPassword = await bcrypt.hash('test123', 10);

  const user = {
    login: uniqueLogin,
    password: 'test123',
    role: role
  };

  await prisma.employee.create({
    data: {
      login: uniqueLogin,
      hashed_password: hashedPassword,
      role
    }
  });

  const res = await request(app).post('/auth/login').send({
    login: user.login,
    password: user.password
  });

  const body = res.body as AuthResponse;

  return {
    token: body.token,
    user: body.user
  };
};

