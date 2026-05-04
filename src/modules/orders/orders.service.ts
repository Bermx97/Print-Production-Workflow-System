import prisma from '../../lib/prisma';
import { Prisma } from '@prisma/client';
type CreateOrderData = Prisma.orderCreateInput;
import { HttpError } from '../../utils/errors';
import { order_status, employee_role } from '@prisma/client';
import { roleStatusMap, workflow } from './orders.workflow';


export const getOrdersService = async () => {
    
    return await prisma.order.findMany({
        orderBy: { due_date: 'asc' }
    });
};

export const getMyOrdersService = async (where: Prisma.orderWhereInput) => {
    return await prisma.order.findMany({
        where, orderBy: { due_date: 'asc' }
    });
};

export const getOrderService = async (orderNumber: number) => {
    const order = await prisma.order.findUnique({
        where: {
            order_number: orderNumber
        }
    });
    if (!order) {
        throw new HttpError('Order not found', 404);
    };
    return order
};

export const createOrderService = async (data: CreateOrderData) => {
    return await prisma.order.create({ data });
};



export const updateOrderStatusService = async (orderNumber: number, userRole: employee_role) => {
    const order = await getOrderService(orderNumber);
    const access = roleStatusMap[userRole];

    if (!access) {
        throw new HttpError('Role has no assigned step', 403);
    }

    let step: order_status;

    if (access.type === "STEP") {
    step = access.step;
    } else {
    const availableSteps = (Object.keys(workflow) as order_status[]).filter(s =>
        !order.completed_steps.includes(s) &&
        workflow[s].every(dep =>
        order.completed_steps.includes(dep)
        )
    );

    if (availableSteps.length === 0) {
        throw new HttpError('No available steps', 409);
    }

    step = availableSteps[0];
    }

    const dependencies = workflow[step] || [];

    const canExecute = dependencies.every(dep =>
        order.completed_steps.includes(dep)
    );

    if (!canExecute) {
        throw new HttpError('Step is blocked by dependencies', 409);
    }

    if (order.completed_steps.includes(step)) {
        throw new HttpError('Step already completed', 409);
    }

    

    return await prisma.order.update({
        where: { order_number: orderNumber },
        data: {
        completed_steps: {
            push: step
        }
        }
    });
};