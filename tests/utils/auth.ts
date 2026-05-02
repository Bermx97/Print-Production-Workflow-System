import request from 'supertest';
import  app from '../../src/app';
import { employee_role } from '@prisma/client';

type AuthResponse = {
  token: string;
  user: {
    id: string;
    role: employee_role;
  };
};

export const getAuthToken = async (role: employee_role = 'admin') => {
  const uniqueLogin = `user_${Date.now()}`;

  const user = {
    login: uniqueLogin,
    password: 'test123',
    role: role
  };

  await request(app).post('/auth/register').send(user);

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

