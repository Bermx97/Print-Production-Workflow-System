import { order_status, employee_role } from '@prisma/client';

export const roleStatusMap: Record<employee_role, order_status[]> = {
    printer: [order_status.printing],
    cutter: [order_status.cutting],
    gluer: [order_status.gluing],
    admin: Object.values(order_status),
    technologist: Object.values(order_status),
    seller: Object.values(order_status)
};