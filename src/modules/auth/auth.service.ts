import prisma from "../../lib/prisma";

export const findEmployee = async (login: string) => {
    return await prisma.employee.findUnique({
        where: { login }
    });
};
