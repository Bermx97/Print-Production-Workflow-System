import { OrderStatusV2, OrderStateV2, WorkflowV2 } from '../../../types/orderStatus-V2';


export const canStartStep = (step: OrderStatusV2, state: OrderStateV2 , wf: WorkflowV2[keyof WorkflowV2]) => {

  if (state[step] === 'ACTIVE') {
    return false;
  }

  if (state[step] === 'DONE') {
    return false;
  }

  const deps = wf[step] ?? [];

  if (deps.length === 0) {
    return true;
  }

  return deps.every(dep => {

    const depState = state[dep];

    return (
      depState === 'ACTIVE' ||
      depState === 'DONE'
    );
  });
};