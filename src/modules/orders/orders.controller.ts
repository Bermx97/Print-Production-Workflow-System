import { Request, Response } from 'express';
import { createOrderService, getAllOrdersService, getOrderService, createStepEventV2 } from './orders.service';
import { HttpError } from '../../utils/errors';
import prisma from '../../lib/prisma';
import { roleStatusMap, getWorkflow as getWorkflowSequence, stepScope } from './orders.workflow';
import { employee_role, step_name } from '@prisma/client';
import { getWorkflowMap, READY_STATUSES, getScope } from './domain/workflowContext';
import { canStartStepForPart } from './workflow/rules/dependency.rules';
import { getLatestExecution } from './workflow/queries/execution.queries';
import { getRoleSteps } from './workflow/access/role.access';
import { getOrderState } from './workflow/state/orderState.service';


export const getOrders = async (req: Request, res: Response) => {
  const orders = await getAllOrdersService();
  console.log(orders)
  return res.status(200).json(orders);
};

export const getOrderByNumber = async (req: Request, res: Response) => {
  const { orderNumber } = req.params;

  const order = await getOrderService(Number(orderNumber));

  if (!order) {
    return res.status(404).json({ message: 'Order not found'  });
  }

  return res.status(200).json({
    ...order,
    workflow: getWorkflowSequence(order.product_type)
  });
};

export const createOrder = async (req: Request, res: Response) => {
  const { orderNumber, dueDate, productType, quantity, customer, numberOfPages, parts } = req.body;
  const existing = await prisma.order.findUnique({
    where: { order_number: orderNumber }
  });

  if (existing) {
    throw new HttpError(`Order ${orderNumber} already exists`, 409);
  }

  const data = {
    order_number: Number(orderNumber),
    due_date: new Date(dueDate),
    product_type: productType,
    createdBy: { connect: { id: req.user.id } },
    quantity: quantity,
    customer: customer,
    number_of_pages: numberOfPages,
  }

  const result = await createOrderService(data, parts);
  res.status(201).json({ message: `Order ${orderNumber} created`, order: result });
};

export const startStepV2 = async (req: Request, res: Response) => {
  const { orderPartId } = req.body
  
  const result =
    await createStepEventV2(
      Number(req.params.orderNumber),
      req.user.id,
      req.user.role,
      'START',
      orderPartId
    );

  return res.json(result);
};

export const endStepV2 = async (req: Request, res: Response) => {
  const { stepQuantity, orderPartId } = req.body

  const result =
    await createStepEventV2(
      Number(req.params.orderNumber),
      req.user.id,
      req.user.role,
      'END',
      orderPartId,
      stepQuantity
    );

  return res.json(result);
};



export const getVisibleOrdersV2 = async (req: Request, res: Response) => {
  const role = req.user.role as employee_role;
  const access = roleStatusMap[role];

  if (!access) {
    return res.json([]);
  }

  const orders = await prisma.order.findMany({
    include: {
      order_parts: true
    }
  });

  const result = await Promise.all(
    orders.map(async (order) => {
      const wf = getWorkflowMap(order.product_type);

      if (!wf) return null;

      const state = await getOrderState(order, wf);

      if (access.type === 'ALL') {
        return {
          ...order,
          state
        };
      }

      const allowedSteps = getRoleSteps(role, wf);

      for (const step of allowedSteps) {
        const scope = getScope(step);

        if (scope === 'per_part') {
          for (const part of order.order_parts) {
            const latestExecution = await getLatestExecution({
              orderId: order.id,
              step,
              orderPartId: part.id
            });

            if (latestExecution?.status === 'active') {
              return {
                ...order,
                state
              };
            }

            const canStart = await canStartStepForPart({
              order,
              wf,
              step,
              orderPartId: part.id
            });

            if (canStart) {
              return {
                ...order,
                state
              };
            }
          }

          continue;
        }

        const latestExecution = await getLatestExecution({
          orderId: order.id,
          step
        });

        if (latestExecution?.status === 'active') {
          return {
            ...order,
            state
          };
        }

        const canStart = await canStartStepForPart({
          order,
          wf,
          step
        });

        if (canStart) {
          return {
            ...order,
            state
          };
        }
      }

      return null;
    })
  );

  return res.json(result.filter(Boolean));
};

export const getOrderPartsV2 = async (req: Request, res: Response) => {
  const role = req.user.role as employee_role;
  const orderNumber = Number(req.params.orderNumber);

  const order = await prisma.order.findFirst({
    where: {
      order_number: orderNumber
    },
    include: {
      order_parts: true
    }
  });

  if (!order) {
    throw new HttpError('Order not found', 404);
  }

  const wf = getWorkflowMap(order.product_type);

  if (!wf) {
    throw new HttpError('Workflow not found', 500);
  }

  const roleSteps = getRoleSteps(role, wf);
  const step = roleSteps[0];

  if (!step) {
    return res.json({
      order_parts: order.order_parts.map((part) => ({
        ...part,
        status: 'available'
      }))
    });
  }

  const parts = await Promise.all(
    order.order_parts.map(async (part) => {
      const execution = await getLatestExecution({
        orderId: order.id,
        step,
        orderPartId: part.id
      });

      if (execution?.status === 'active' || execution?.status === 'done') {
        return {
          ...part,
          step,
          status: execution.status
        };
      }

      const scope = getScope(step);
      const canStart =
        scope === 'per_part'
          ? await canStartStepForPart({
              order,
              wf,
              step,
              orderPartId: part.id
            })
          : await canStartStepForPart({
              order,
              wf,
              step
            });

      return {
        ...part,
        step,
        status: canStart ? 'available' : 'blocked'
      };
    })
  );

  return res.json({
    order_parts: parts
  });
};
