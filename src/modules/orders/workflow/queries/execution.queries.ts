import prisma from "../../../../lib/prisma";
import { OrderStatusV2 } from "../../../../types/orderStatus";
import { stepScope } from "../../orders.workflow";
import { WorkflowStep } from "../../../../types/orderStatus";
import { step_name } from "@prisma/client";
import { BLOCK_START_STATUSES, READY_STATUSES } from "../../domain/workflowContext";
import { getScope } from "../../domain/workflowContext";




export const findCurrentExecution = async (ctx: {
  tx: any;
  order: any;
  step: OrderStatusV2;
  orderPartId: string;
}) => {
  const { tx, order, step, orderPartId } = ctx;
  const scope = stepScope[step as WorkflowStep];

  return tx.step_execution.findFirst({
    where: {
      order_id: order.id,
      step_type: step,
      status: {
        in: [...BLOCK_START_STATUSES]
      },

      ...(scope === 'per_part'
        ? { order_part_id: orderPartId }
        : {})
    },
    orderBy: {
      started_at: 'desc'
    }
  });
};

export const getLatestExecution = async (ctx: { orderId: string; step: step_name; orderPartId?: string | null; }) => {
  const { orderId, step, orderPartId } = ctx;
  const scope = getScope(step);

  return prisma.step_execution.findFirst({
    where: {
      order_id: orderId,
      step_type: step as step_name,

      ...(scope === 'per_part'
        ? { order_part_id: orderPartId }
        : {})
    },
    orderBy: {
      started_at: 'desc'
    }
  });
};

export const isStepStartedOrDone = async (ctx: { orderId: string; step: step_name; orderPartId?: string | null; }) => {
  const execution = await getLatestExecution(ctx);

  return Boolean(
    execution &&
    READY_STATUSES.includes(execution.status as any)
  );
};

export const hasStartedOrFinishedExecution = async (ctx: {
  orderId: string;
  step: step_name;
  orderPartId?: string | null;
}) => {
  const execution = await getLatestExecution(ctx);

  return Boolean(
    execution &&
    BLOCK_START_STATUSES.includes(execution.status as any)
  );
};
