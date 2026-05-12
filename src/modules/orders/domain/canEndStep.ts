import { OrderStatusV2, OrderStateV2, WorkflowV2 } from '../../../types/orderStatus-V2';

export const canEndStep = (step: OrderStatusV2, state: OrderStateV2 , wf: WorkflowV2[keyof WorkflowV2]) => {

  if (state[step] !== 'ACTIVE') {
    return false;
  }

  const deps = wf[step] ?? [];

  return deps.every(dep =>
    state[dep] === 'DONE'
  );
};