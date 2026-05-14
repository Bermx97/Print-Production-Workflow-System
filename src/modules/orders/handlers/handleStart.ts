import { OrderStatusV2 } from "../../../types/orderStatus-V2";
import { HttpError } from "../../../utils/errors";
import { assertRoleCanAccessStep } from "../domain/roleGuard";

export const handleStart = async (ctx: {
  tx: any;
  order: any;
  userId: string;
  role: any;
  availableSteps: OrderStatusV2[];
}) => {

  const { tx, order, userId, role, availableSteps } = ctx;

  if (availableSteps.length === 0) {
    throw new HttpError('Start already completed or not available anymore', 409);
  }

  const nextStep = availableSteps[0];

  try {
    assertRoleCanAccessStep(role, nextStep);
  } catch {
    throw new HttpError('Role not allowed for this step', 403);
  }

  const lastLog = await tx.step_logs.findFirst({
    where: {
      order_id: order.id,
      step_name: nextStep
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  if (lastLog?.event_type === 'START') {
    throw new HttpError('Step already active', 409);
  }

  return tx.step_logs.create({
    data: {
      order_id: order.id,
      employee: userId,
      step_name: nextStep,
      event_type: 'START'
    }
  });
};