import { OrderStatusV2, OrderStateV2 } from "../../../types/orderStatus-V2";
import { assertRoleCanAccessStep } from "../domain/roleGuard";
import { HttpError } from "../../../utils/errors";
import { canEndStep } from "../domain/canEndStep";

export const handleEnd = async (ctx: {
  tx: any;
  order: any;
  userId: string;
  role: any;
  state: OrderStateV2;
  wf: Record<string, any>;
}) => {

  const { tx, order, userId, role, state, wf } = ctx;
  const activeStep = (Object.keys(wf) as OrderStatusV2[]).find(step => {

    if (state[step] !== 'ACTIVE') {
      return false;
    }

    try {
      assertRoleCanAccessStep(role, step);
      return true;
    } catch {
      return false;
    }
  });

  if (!activeStep) {
    throw new HttpError('No active step', 409);
  }

  if (!canEndStep(activeStep, state, wf)) {
    throw new HttpError('Cannot end step before dependencies are DONE', 409);
  }

  await tx.step_logs.create({
    data: {
      order_id: order.id,
      employee: userId,
      step_name: activeStep,
      event_type: 'END'
    }
  });
};