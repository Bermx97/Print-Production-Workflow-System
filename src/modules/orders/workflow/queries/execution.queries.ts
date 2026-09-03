import prisma from "../../../../lib/prisma";
import { OrderStatusV2 } from "../../../../types/orderStatus";
import { stepScope } from "../../orders.workflow";
import { WorkflowStep } from "../../../../types/orderStatus";
import { step_name } from "@prisma/client";
import { BLOCK_START_STATUSES, READY_STATUSES } from "../../domain/workflowContext";
import { getScope } from "../../domain/workflowContext";
import type { Prisma } from '@prisma/client';
import type { order as Order, step_execution } from '@prisma/client';





export const findCurrentExecution = async (ctx: {
  tx: Prisma.TransactionClient;
  order: Order;
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


export const isStepStartedOrDone = async (
  ctx: { orderId: string; step: step_name; orderPartId?: string | null; },
  executionsForOrder?: step_execution[]
) => {
  const execution = await getLatestExecution(ctx, executionsForOrder);

  return Boolean(
    execution &&
    READY_STATUSES.includes(execution.status)
  );
};

export const hasStartedOrFinishedExecution = async (
  ctx: { orderId: string; step: step_name; orderPartId?: string | null; },
  executionsForOrder?: step_execution[]
) => {
  const execution = await getLatestExecution(ctx, executionsForOrder);

  return Boolean(
    execution &&
    BLOCK_START_STATUSES.includes(execution.status)
  );
};

export const getLatestExecution = async (
  ctx: { orderId: string; step: step_name; orderPartId?: string | null; },
  executionsForOrder?: step_execution[]
) => {
  const { orderId, step, orderPartId } = ctx;
  const scope = getScope(step);

  if (executionsForOrder) {
    return executionsForOrder.find((ex) => 
      ex.step_type === step &&
      (scope === 'per_part' ? ex.order_part_id === orderPartId : true)
    ) || null;
  }

  return prisma.step_execution.findFirst({
    where: {
      order_id: orderId,
      step_type: step as step_name,
      ...(scope === 'per_part' ? { order_part_id: orderPartId } : {})
    },
    orderBy: {
      started_at: 'desc'
    }
  });
};
