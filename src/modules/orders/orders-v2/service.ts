import prisma from "../../../lib/prisma";
import { HttpError } from "../../../utils/errors";

import { workflow } from "./workflow";
import { buildState } from "./state";
import { canStartStep } from "./canStartStep";
import { assertRoleCanAccessStep } from "./role.guard";

type EventType = "START" | "END";

export const createStepEventV2 = async (
  orderNumber: number,
  userId: string,
  role: any,
  eventType: EventType
) => {

  return prisma.$transaction(async (tx) => {

    // ================= ORDER =================

    const order = await tx.order.findFirst({
      where: {
        order_number: orderNumber
      }
    });

    if (!order) {
      throw new HttpError(
        "Order not found",
        404
      );
    }

    // ================= WORKFLOW =================

    const wf = workflow[order.product_type];

    if (!wf) {
      throw new HttpError(
        "Workflow not found",
        500
      );
    }

    // ================= LOGS =================

    const logs = await tx.step_logs.findMany({
      where: {
        order_id: order.id
      },
      orderBy: {
        created_at: "asc"
      }
    });

    // ================= STATE =================

    const state = buildState(logs, wf);

    console.log("STATE:", state);

    // ================= AVAILABLE STEPS =================

    const allSteps = Object.keys(wf);

    const availableSteps = allSteps.filter(step => {

      // step DONE -> skip
      if (state[step] === "DONE") {
        return false;
      }

      // step ACTIVE -> skip
      if (state[step] === "ACTIVE") {
        return false;
      }

      // workflow dependency check
      const workflowOk =
        canStartStep(step, state, wf);

      if (!workflowOk) {
        return false;
      }

      // role check
      try {

        assertRoleCanAccessStep(
          role,
          step
        );

        return true;

      } catch {

        return false;
      }
    });

    console.log(
      "AVAILABLE:",
      availableSteps
    );

    // ====================================================
    // START
    // ====================================================

    if (eventType === "START") {

      if (availableSteps.length === 0) {

        throw new HttpError(
          "No available step for this role",
          409
        );
      }

      // 🔥 ważne:
      // operator bierze pierwszy dostępny
      // z kroków które MOŻE zrobić

      const nextStep = availableSteps[0];

      // zabezpieczenie przed double start

      const lastLog = await tx.step_logs.findFirst({
        where: {
          order_id: order.id,
          step_name: nextStep
        },
        orderBy: {
          created_at: "desc"
        }
      });

      if (
        lastLog &&
        lastLog.event_type === "START"
      ) {
        throw new HttpError(
          "Step already active",
          409
        );
      }

      return tx.step_logs.create({
        data: {
          order_id: order.id,
          employee: userId,
          step_name: nextStep,
          event_type: "START"
        }
      });
    }

    // ====================================================
    // END
    // ====================================================

    if (eventType === "END") {

      // 🔥 szukamy aktywnego stepu
      // TYLKO dla tej roli

      const activeStep = Object.keys(state)
        .find(step => {

          if (state[step] !== "ACTIVE") {
            return false;
          }

          try {

            assertRoleCanAccessStep(
              role,
              step
            );

            return true;

          } catch {

            return false;
          }
        });

      if (!activeStep) {

        throw new HttpError(
          "No active step",
          409
        );
      }

      return tx.step_logs.create({
        data: {
          order_id: order.id,
          employee: userId,
          step_name: activeStep,
          event_type: "END"
        }
      });
    }

    // ====================================================

    throw new HttpError(
      "Invalid event",
      400
    );
  });
};