import prisma from "../../../../lib/prisma";
import { HttpError } from "../../../../utils/errors";
import { employee_role } from "@prisma/client";
import { workflow } from "../../orders.workflow"; 
import { buildState } from "../state/state"; 
import { canStartStep } from "../domain/canStartStep";
import { assertRoleCanAccessStep } from "../domain/roleGuard"; 
import { canEndStep } from "../domain/canEndStep";
import { OrderStatusV2, OrderStateV2 } from "../../../../types/orderStatus-V2";
import { handleStart } from ".././handlers/handleStart";
import { handleEnd } from ".././handlers/handleEnd";

type EventType = 'START' | 'END';

export const createStepEventV2 = async (orderNumber: number, userId: string, role: employee_role, eventType: EventType) => {

  return prisma.$transaction(async (tx) => {

    const order = await tx.order.findFirst({
      where: {
        order_number: orderNumber
      }
    });

    if (!order) {
      throw new HttpError('Order not found', 404);
    }

    const wf = workflow[order.product_type];

    if (!wf) {
      throw new HttpError('Workflow not found', 500);
    }

    const logs = await tx.step_logs.findMany({
      where: {
        order_id: order.id
      },
      orderBy: {
        created_at: 'asc'
      }
    });

    const state = buildState(logs, wf);
    const allSteps = Object.keys(wf) as OrderStatusV2[];
    const availableSteps = allSteps.filter(step => {

      if (state[step] === 'DONE') {
        return false;
      }

      if (state[step] === 'ACTIVE') {
        return false;
      }

      const workflowOk =
        canStartStep(step, state, wf);

      if (!workflowOk) {
        return false;
      }

      try {
        assertRoleCanAccessStep(role,step);

        return true;

      } catch {

        return false;
      }
    });

    if (eventType === 'START') {
      return handleStart({tx, order, userId, role, availableSteps});
    }

    if (eventType === 'END') {
      return handleEnd({tx, order, userId, role, state, wf});
    }
  });
};
