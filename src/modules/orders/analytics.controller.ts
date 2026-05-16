import { Request, Response } from 'express';
import { getOrderService } from './orders.service'
import { workflow } from './orders.workflow';
import { getStepSpeed } from './analytics.service';
import { OrderStatus } from '../../types/orderStatus';

export const getAverageStepsSpeed = async (req: Request, res: Response) => {
  const { orderNumber } = req.params;
  const order = await getOrderService(Number(orderNumber));
  const quantities = (order.step_quantities ?? {}) as Record<OrderStatus, number>;

  const workflowMap = workflow[order.product_type];

  const steps = Object.keys(workflowMap) as OrderStatus[];

  const speeds = steps
    .map(step =>
      getStepSpeed(
        order.step_logs,
        step,
        quantities[step]
      )
    )
    .filter((s): s is NonNullable<typeof s> => s !== null);

  return res.json({
    orderNumber: orderNumber,
    speeds
  });
};
