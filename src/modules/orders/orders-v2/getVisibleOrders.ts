import prisma from "../../../lib/prisma";

import { workflow } from "./workflow";
import { roleStatusMap } from "../orders.workflow";

import { buildState } from "./state";
import { canStartStep } from "./canStartStep";

export const getVisibleOrdersV2 = async (req, res) => {

  const role = req.user.role;

  const orders = await prisma.order.findMany();

  const result = await Promise.all(

    orders.map(async (order) => {

      const wf = workflow[order.product_type];

      if (!wf) return null;

      const logs = await prisma.step_logs.findMany({
        where: { order_id: order.id },
        orderBy: { created_at: "asc" }
      });

      const state = buildState(logs, wf);

      const access = roleStatusMap[role];

      // ADMIN FULL ACCESS
      if (access.type === "ALL") {
        return { ...order, state };
      }

      // ROLE STEPS ONLY THAT EXIST IN WF
      const allowedSteps = access.steps.filter(
        step => wf[step]
      );

      // 🔥 KLUCZ: visibility = CAN START OR ACTIVE
      const hasVisibleStep = allowedSteps.some(step => {

        return (
          state[step] === "ACTIVE" ||
          canStartStep(step, state, wf)
        );
      });

      if (!hasVisibleStep) return null;

      return { ...order, state };
    })
  );

  return res.json(result.filter(Boolean));
};