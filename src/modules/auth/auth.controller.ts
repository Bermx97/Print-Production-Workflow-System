import bcrypt from 'bcrypt';
import { Request, Response } from "express";
import { findEmployee } from './auth.service';

type LoginBody = {
  login: string;
  password: string;
};

export const login = async (req: Request<{}, {}, LoginBody>, res: Response) => {
    const { login, password } = req.body;
    const employee = await findEmployee(login);
    if(!employee) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json(employee);
};