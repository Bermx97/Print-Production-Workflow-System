import { WorkflowMap, OrderStatus } from "../../../../types/orderStatus";
import prisma from "../../../../lib/prisma";
import { BLOCK_START_STATUSES } from "../../domain/workflowContext";
import { getScope } from "../../domain/workflowContext";
import { getPartsForStep } from "../../orders.workflow";
import { OrderWithParts } from "../../../../types/order.types";

export const getOrderState = async (order: OrderWithParts, wf: WorkflowMap, executionsForOrder?: any[]) => {
  const state: Record<string, string> = {};

  const executions = executionsForOrder || await prisma.step_execution.findMany({
    where: { order_id: order.id },
    orderBy: { started_at: 'desc' }
  });

  for (const step of Object.keys(wf) as OrderStatus[]) {
    const scope = getScope(step);

    if (scope === 'per_part') {
      const partIds = getPartsForStep(order.order_parts, step).map((part) => part.id);

      const stepExecutions = executions.filter((ex: any) => 
        ex.step_type === step &&
        ex.order_part_id && 
        partIds.includes(ex.order_part_id) &&
        BLOCK_START_STATUSES.includes(ex.status as any)
      );

      if (stepExecutions.some((execution: any) => execution.status === 'active')) {
        state[step] = 'ACTIVE';
      } else if (stepExecutions.some((execution: any) => execution.status === 'paused')) {
        state[step] = 'PAUSED';
      } else if (
        partIds.length > 0 &&
        partIds.every((partId: string) =>
          stepExecutions.some(
            (execution: any) =>
              execution.order_part_id === partId &&
              execution.status === 'done'
          )
        )
      ) {
        state[step] = 'DONE';
      } else {
        state[step] = 'WAITING';
      }

      continue;
    }

    const execution = executions.find((ex: any) => 
      ex.step_type === step &&
      BLOCK_START_STATUSES.includes(ex.status as any)
    );

    if (execution?.status === 'active') {
      state[step] = 'ACTIVE';
    } else if (execution?.status === 'paused') {
      state[step] = 'PAUSED';
    } else if (execution?.status === 'done') {
      state[step] = 'DONE';
    } else {
      state[step] = 'WAITING';
    }
  }

  return state;
};
