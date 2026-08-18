import { Request, Response } from 'express';
import { getOrderService, getOrderWithRelations } from './orders.service'
import { getStepSpeed, getOrderStatsService } from './analytics.service';

export const getAverageStepsSpeed = async (req: Request, res: Response) => {
  const { orderNumber } = req.params;
  const order = await getOrderWithRelations(Number(orderNumber));
  const steps = order.step_execution || [];
  const parts = order.order_parts || [];
  

  const stepStats = steps
    .filter(step => step.status === "done" && step.started_at && step.finished_at)
    .map(step => {
      const start = (step.started_at as Date).getTime();
      const finish = (step.finished_at as Date).getTime();
      const durationMinutes = (finish - start) / (1000 * 60);
      const doneQuantity = step.done_quantity ?? 0;
      const matchingPart = parts.find(p => p.id === step.order_part_id);
      const runs = matchingPart?.runs ?? 1
      const variantName = matchingPart ? matchingPart.variant : "-";
      const average = (durationMinutes > 0 ? doneQuantity / durationMinutes : 0) * runs;

      return {
        id: step.id,
        orderPartId: step.order_part_id,
        stepType: step.step_type,
        doneQuantity: step.done_quantity,
        durationMinutes: Number(durationMinutes.toFixed(2)),
        average: Number(average.toFixed(2)),
        variant: variantName,
        signatures: runs
      };
    });
  return res.json(stepStats);
};

export const getOrderStatsController = async (req: Request, res: Response) => {
  const stats = await getOrderStatsService(Number(req.params.orderNumber));
  return res.json({ doneByStepAndVariant: stats });
};