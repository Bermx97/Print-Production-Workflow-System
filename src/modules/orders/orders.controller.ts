import { employee_role } from '@prisma/client';
import { Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { HttpError } from '../../utils/errors';
import { BLOCK_START_STATUSES, getScope, getWorkflowMap, IN_PROGRESS_STATUSES } from './domain/workflowContext';
import { createOrderService, createStepEventV2, getAllOrdersService, getOrderPartsService, getOrderService, getVisibleOrdersForRole, getMyActiveStepsService } from './orders.service';
import { getWorkflow as getWorkflowSequence, roleStatusMap } from './orders.workflow';
import { getRoleSteps } from './workflow/access/role.access';
import { getLatestExecution } from './workflow/queries/execution.queries';
import { canStartStepForPart } from './workflow/rules/dependency.rules';
import { getOrderState } from './workflow/state/orderState.service';


export const getOrders = async (req: Request, res: Response) => {
  const orders = await getAllOrdersService();
  return res.status(200).json(orders);
};

export const getOrderByNumber = async (req: Request, res: Response) => {
  const { orderNumber } = req.params;

  const order = await getOrderService(Number(orderNumber));
  const wf = getWorkflowMap(order.product_type);

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  if (!wf) {
    throw new HttpError('Workflow not found', 500);
  }

  const state = await getOrderState(order, wf);

  return res.status(200).json({
    ...order,
    workflow: getWorkflowSequence(order.product_type),
    state
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

export const getMyActiveSteps = async (req: Request, res: Response) => {
  const result = await getMyActiveStepsService(req.user.id);
  return res.json(result);
}

export const startStepV2 = async (req: Request, res: Response) => {
  const { orderPartId } = req.body;
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
  const { doneQuantity, orderPartId } = req.body;

  const result =
    await createStepEventV2(
      Number(req.params.orderNumber),
      req.user.id,
      req.user.role,
      'END',
      orderPartId,
      doneQuantity
    );

  return res.json(result);
};

export const pauseStepV2 = async (req: Request, res: Response) => {
  const { orderPartId } = req.body;

  const result =
    await createStepEventV2(
      Number(req.params.orderNumber),
      req.user.id,
      req.user.role,
      'PAUSE',
      orderPartId
    );

  return res.json(result);
};

export const resumeStepV2 = async (req: Request, res: Response) => {
  const { orderPartId } = req.body;

  const result =
    await createStepEventV2(
      Number(req.params.orderNumber),
      req.user.id,
      req.user.role,
      'RESUME',
      orderPartId
    );

  return res.json(result);
};

export const getOrderPartsV2 = async (req: Request, res: Response) => {

  const role = req.user.role as employee_role;
  const orderNumber = Number(req.params.orderNumber);

  const order = await prisma.order.findUnique({
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
      const executions = await prisma.step_execution.findMany({
        where: {
          order_id: order.id,
          step_type: step
        }
      });

      const executionMap = new Map(
        executions.map(e => [e.order_part_id, e])
      );

      const execution = executionMap.get(part.id);

      if (execution && BLOCK_START_STATUSES.includes(execution.status as any)) {
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


export const getOrderParts = async (req: Request, res: Response) => {
  const orderNumber = Number(req.params.orderNumber);
  const parts = await getOrderPartsService(orderNumber);
  console.log(parts)
  return res.json({ parts: parts });
};

export const getVisibleOrders = async (req: Request, res: Response) => {
    const role = req.user.role as employee_role;
    const access = roleStatusMap[role];

    if (!access) {
      return res.json([]);
    }

    const visibleOrders = await getVisibleOrdersForRole(role, access);

    return res.json(visibleOrders);
};