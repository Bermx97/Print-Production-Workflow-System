import prisma from '../../lib/prisma';
import { employee_role } from '@prisma/client';

export const findEmployee = async (login: string) => {
    return await prisma.employee.findUnique({
        where: { login }
    });
};

export const createEmployee = async (login: string, hashedPassword:string, role: employee_role) => {
    return await prisma.employee.create({
        data: {
            login: login,
            hashed_password: hashedPassword,
            role: role as employee_role
        }
    });
};
