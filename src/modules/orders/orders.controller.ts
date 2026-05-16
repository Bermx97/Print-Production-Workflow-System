import { Request, Response } from 'express';
import { createOrderService, getAllOrdersService, getOrderService, createStepEventV2 } from './orders.service';
import { HttpError } from '../../utils/errors';
import prisma from '../../lib/prisma';
import { workflow, roleStatusMap, getWorkflow as getWorkflowSequence, stepScope } from './orders.workflow';
import { employee_role, step_name } from '@prisma/client';
import { OrderStatus, WorkflowMap, WorkflowStep } from '../../types/orderStatus';
import { getWorkflowMap } from './domain/workflowContext';


export const getOrders = async (req: Request, res: Response) => {
  const orders = await getAllOrdersService();
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

const READY_STATUSES = ['active', 'done'] as const;


const getScope = (step: string) => stepScope[step as WorkflowStep];

const getRoleSteps = (role: employee_role, wf: WorkflowMap) => {
  const access = roleStatusMap[role];

  if (!access) return [];

  if (access.type === 'ALL') {
    return Object.keys(wf) as OrderStatus[];
  }

  return access.steps.filter((step) => wf[step]);

};

const getLatestExecution = async (ctx: { orderId: string; step: string; orderPartId?: string | null; }) => {
  const { orderId, step, orderPartId } = ctx;
  const scope = getScope(step);

  return prisma.step_execution.findFirst({
    where: {
      order_id: orderId,
      step_type: step as step_name,

      ...(scope === 'per_part'
        ? { order_part_id: orderPartId }
        : {})
    },
    orderBy: {
      started_at: 'desc'
    }
  });
};

const isStepStartedOrDone = async (ctx: { orderId: string; step: string;orderPartId?: string | null; }) => {
  const execution = await getLatestExecution(ctx);

  return Boolean(
    execution &&
    READY_STATUSES.includes(execution.status as any)
  );
};

const allPartsReadyInDependency = async (ctx: { order: any; dependencyStep: string; }) => {
  const { order, dependencyStep } = ctx;
  const dependencyScope = getScope(dependencyStep);
  const partIds = order.order_parts.map((part: any) => part.id);

  if (dependencyScope !== 'per_part') {
    return isStepStartedOrDone({
      orderId: order.id,
      step: dependencyStep
    });
  }

  if (partIds.length === 0) return false;

  const readyExecutions = await prisma.step_execution.findMany({
    where: {
      order_id: order.id,
      step_type: dependencyStep as step_name,
      order_part_id: {
        in: partIds
      },
      status: {
        in: [...READY_STATUSES]
      }
    },
    select: {
      order_part_id: true
    }
  });

  const readyPartIds = new Set(
    readyExecutions.map((execution) => execution.order_part_id)
  );

  return partIds.every((partId: string) => readyPartIds.has(partId));
};

const canStartStepForPart = async (ctx: {
  order: any;
  wf: WorkflowMap;
  step: string;
  orderPartId?: string | null;
}) => {
  const { order, wf, step, orderPartId } = ctx;
  const scope = getScope(step);

  const alreadyStartedOrDone = await isStepStartedOrDone({
    orderId: order.id,
    step,
    orderPartId
  });

  if (alreadyStartedOrDone) return false;

  const dependencies = wf[step as OrderStatus] ?? [];

  for (const dependencyStep of dependencies) {
    if (scope === 'per_part') {
      const dependencyReady = await isStepStartedOrDone({
        orderId: order.id,
        step: dependencyStep,
        orderPartId
      });

      if (!dependencyReady) return false;

      continue;
    }

    const dependencyReady = await allPartsReadyInDependency({
      order,
      dependencyStep
    });

    if (!dependencyReady) return false;
  }

  return true;
};

const getOrderState = async (order: any, wf: WorkflowMap) => {
  const state: Record<string, string> = {};

  for (const step of Object.keys(wf) as OrderStatus[]) {
    const scope = getScope(step);

    if (scope === 'per_part') {
      const partIds = order.order_parts.map((part: any) => part.id);

      const executions = await prisma.step_execution.findMany({
        where: {
          order_id: order.id,
          step_type: step as step_name,
          order_part_id: {
            in: partIds
          },
          status: {
            in: [...READY_STATUSES]
          }
        },
        select: {
          status: true,
          order_part_id: true
        }
      });

      if (executions.some((execution) => execution.status === 'active')) {
        state[step] = 'ACTIVE';
      } else if (
        partIds.length > 0 &&
        partIds.every((partId: string) =>
          executions.some(
            (execution) =>
              execution.order_part_id === partId &&
              execution.status === 'done'
          )
        )
      ) {
        state[step] = 'DONE';
      } else {
        state[step] = 'WAITING';
      }

      continue;
    }

    const execution = await prisma.step_execution.findFirst({
      where: {
        order_id: order.id,
        step_type: step as step_name,
        status: {
          in: [...READY_STATUSES]
        }
      },
      orderBy: {
        started_at: 'desc'
      }
    });

    if (execution?.status === 'active') {
      state[step] = 'ACTIVE';
    } else if (execution?.status === 'done') {
      state[step] = 'DONE';
    } else {
      state[step] = 'WAITING';
    }
  }

  return state;
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
