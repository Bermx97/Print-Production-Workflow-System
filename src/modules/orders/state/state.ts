import { WorkflowV2, OrderStateV2, OrderStatusV2 } from '../../../types/orderStatus-V2';

const GLOBAL_STEPS = new Set([
  'sewing',
  'case_making',
  'hardcover_binding',
  'binding',
  'stitching'
]);

export const buildState = (
  logs: any[],
  wf: WorkflowV2[keyof WorkflowV2],
  orderPartId?: string
): OrderStateV2 => {

  const state = {} as OrderStateV2;
  const steps = Object.keys(wf) as OrderStatusV2[];

  for (const step of steps) {

    const stepLogs = logs.filter(l => {

      // 🔥 kluczowe: jeśli step per-part → filtruj po part
      if (orderPartId) {
        return l.step_name === step && l.order_part_id === orderPartId;
      }

      // shared step → ignoruj part
      return l.step_name === step;
    });

    const hasStart = stepLogs.some(l => l.event_type === 'START');
    const hasEnd = stepLogs.some(l => l.event_type === 'END');

    if (hasEnd) {
      state[step] = 'DONE';
    } else if (hasStart) {
      state[step] = 'ACTIVE';
    } else {
      state[step] = 'NOT_STARTED';
    }
  }

  return state;
};