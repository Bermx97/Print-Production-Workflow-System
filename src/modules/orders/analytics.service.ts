import { OrderStatus } from '../../types/orderStatus';

export function getStepSpeed(logs: any[], step: OrderStatus, quantity: number) {
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
