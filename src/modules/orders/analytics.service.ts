import { OrderStatus } from '../../types/orderStatus';
import { getOrderWithRelations } from './orders.service';

export function getStepSpeed(logs: any[], step: OrderStatus, quantity: number) {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return null;
  }

  const stepLogs = logs
    .filter(l => l.step_name === step)
    .sort((a, b) =>
      new Date(a.created_at).getTime() -
      new Date(b.created_at).getTime()
    );

  const start = stepLogs.find(l => l.event_type === 'START');
  const end = stepLogs.find(l => l.event_type === 'END');

  if (!start || !end) return null;
  

  const durationHoursRaw =
    (new Date(end.created_at).getTime() -
    new Date(start.created_at).getTime()) / 3600000;

  if (durationHoursRaw <= 0) return null;

  const speedRaw = quantity / durationHoursRaw;

  return {
    step,
    quantity,
    durationHours: Number(durationHoursRaw.toFixed(2)),
    speed: Number(speedRaw.toFixed(2))
  };
};

export const getOrderStatsService = async (orderNumber: number) => {
  const order = await getOrderWithRelations(orderNumber);

  return order.step_execution
    .filter(e => e.status === 'done')
    .reduce((acc, e) => {
      const part = order.order_parts.find(p => p.id === e.order_part_id);

      const step = e.step_type;
      const variant = part?.variant ?? 'UNKNOWN';

      if (!acc[step]) acc[step] = {};
      acc[step][variant] = (acc[step][variant] ?? 0) + (e.done_quantity ?? 0);

      return acc;
    }, {} as Record<string, Record<string, number>>);
};
