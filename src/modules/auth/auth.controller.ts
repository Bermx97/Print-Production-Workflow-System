import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import { findEmployee, createEmployee } from './auth.service';
import { HttpError } from "../../utils/errors";
import { AuthUser } from "../../types/auth";
import jwt from "jsonwebtoken";
import { employee_role } from "@prisma/client";

type LoginBody = {
  login: string;
  password: string;
};

export const login = async (req: Request<{}, {}, LoginBody>, res: Response) => {
    const { login, password } = req.body;
    const employee = await findEmployee(login);

    if (!employee) {
      throw new HttpError('Invalid credentials', 401);
    }
    const isMatch = await bcrypt.compare(password, employee.hashed_password);

    if (!isMatch) {
      throw new HttpError('Invalid credentials', 401);
    }
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new HttpError("Internal Server Error", 500);
    }

    const payload: AuthUser = {
      userId: employee.id,
      role: employee.role
    };

    const token = jwt.sign(payload, secret, { expiresIn: "1h" });
      return res.json({
        token,
        user: {
          id: employee.id,
          login: employee.login,
          role: employee.role
        }
  });
};

type RegisterBody = {
  login: string;
  password: string;
  role: employee_role;
};

export const registerEmployee = async (req: Request<{}, {}, RegisterBody>, res: Response) => {

        console.log("BODY:", req.body);

  const { login, password, role } = req.body as RegisterBody;
  const employee = await findEmployee(login);
  if (employee) {
    throw new HttpError('User already exist', 409);
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await createEmployee(login, hashedPassword, role);
  res.status(201).json({ message: `User ${result.login} with role ${result.role} created` });
}