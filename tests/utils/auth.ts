import request from 'supertest';
import  app from '../../src/app';

export const getAuthToken = async () => {
  const uniqueLogin = `user_${Date.now()}`;

  const user = {
    login: uniqueLogin,
    password: 'test123',
    role: 'admin'
  };

  await request(app).post('/auth/register').send(user);

  const res = await request(app).post('/auth/login').send({
    login: user.login,
    password: user.password
  });

  return {
    token: res.body.token,
    user: res.body.user
  };
};

