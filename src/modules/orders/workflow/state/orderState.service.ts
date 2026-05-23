import { WorkflowMap, OrderStatus } from "../../../../types/orderStatus";
import prisma from "../../../../lib/prisma";
import { step_name } from "@prisma/client";
import { BLOCK_START_STATUSES } from "../../domain/workflowContext";
import { getScope } from "../../domain/workflowContext";

export const getOrderState = async (order: any, wf: WorkflowMap) => {
  const state: Record<string, string> = {};

  for (const step of Object.keys(wf) as OrderStatus[]) {
    const scope = getScope(step);

    if (scope === 'per_part') {
      const partIds = order.order_parts.map((part: any) => part.id);

      const executions = await prisma.step_execution.findMany({
        where: {
          order_id: order.id,
          step_type: step as step_name,
          order_part_id: {
            in: partIds
          },
          status: {
            in: [...BLOCK_START_STATUSES]
          }
        },
        select: {
          status: true,
          order_part_id: true
        }
      });

      if (executions.some((execution) => execution.status === 'active')) {
        state[step] = 'ACTIVE';
      } else if (executions.some((execution) => execution.status === 'paused')) {
        state[step] = 'PAUSED';
      } else if (
        partIds.length > 0 &&
        partIds.every((partId: string) =>
          executions.some(
            (execution) =>
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

    const execution = await prisma.step_execution.findFirst({
      where: {
        order_id: order.id,
        step_type: step as step_name,
        status: {
          in: [...BLOCK_START_STATUSES]
        }
      },
      orderBy: {
        started_at: 'desc'
      }
    });

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
