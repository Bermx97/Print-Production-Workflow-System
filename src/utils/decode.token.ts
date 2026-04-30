import jwt from "jsonwebtoken";
import { employee_role } from '@prisma/client';

export const verifyToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_SECRET!) as {
    id: string;
    login: string;
    role: employee_role;
  };
};