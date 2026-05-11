import prisma from "../../../lib/prisma";
import { Request, Response } from 'express';
import { workflow } from "../orders.workflow"; 
import { roleStatusMap } from "../orders.workflow";
import { buildState } from "./state/state"; 
import { canStartStep } from "./domain/canStartStep"; 

export const getVisibleOrdersV2 = async (req: Request, res: Response) => {

  const role = req.user.role;
  const orders = await prisma.order.findMany();
  const result = await Promise.all(

    orders.map(async (order) => {

      const wf = workflow[order.product_type];

      if (!wf) return null;

      const logs = await prisma.step_logs.findMany({
        where: { order_id: order.id },
        orderBy: { created_at: 'asc' }
      });

      const state = buildState(logs, wf);
      const access = roleStatusMap[role];

      if (access.type === 'ALL') {
        return { ...order, state };
      }

      const allowedSteps = access.steps.filter(
        step => wf[step]
      );

      const hasVisibleStep = allowedSteps.some(step => {

        return (
          state[step] === 'ACTIVE' ||
          canStartStep(step, state, wf)
        );
      });

      if (!hasVisibleStep) return null;

      return { ...order, state };
    })
  );

  return res.json(result.filter(Boolean));
};