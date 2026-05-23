import { step_name } from "@prisma/client";
import { HttpError } from "../../../../utils/errors";
import { READY_STATUSES } from "../../domain/workflowContext";
import { isStepStartedOrDone, findCurrentExecution, hasStartedOrFinishedExecution } from "../queries/execution.queries";
import { OrderStatus, WorkflowMap, OrderStatusV2, WorkflowStep } from "../../../../types/orderStatus";
import prisma from "../../../../lib/prisma";
import { getScope, getStepDependencies } from "../../domain/workflowContext";
import { employee_role } from "@prisma/client";
import { assertRoleCanAccessStep } from "../../domain/roleGuard";
import { getOrderParts } from "../queries/orderParts.queries";
import { stepScope } from "../../orders.workflow";


export const canStartStepForPart = async (ctx: {
  order: any;
  wf: WorkflowMap;
  step: step_name;
  orderPartId?: string | null;
}) => {
  const { order, wf, step, orderPartId } = ctx;
  const scope = getScope(step);

  const alreadyStartedOrDone = await hasStartedOrFinishedExecution({
    orderId: order.id,
    step,
    orderPartId
  });

  if (alreadyStartedOrDone) return false;

  const dependencies = wf[step as OrderStatus] ?? [];

  for (const dependencyStep of dependencies) {
    if (scope === 'per_part') {
      const dependencyReady = await isStepStartedOrDone({
        orderId: order.id,
        step: dependencyStep,
        orderPartId
      });

      if (!dependencyReady) return false;

      continue;
    }

    const dependencyReady = await allPartsReadyInDependency({
      order,
      dependencyStep
    });

    if (!dependencyReady) return false;
  }

  return true;
};

export const allPartsReadyInDependency = async (ctx: { order: any; dependencyStep: step_name; }) => {
  const { order, dependencyStep } = ctx;
  const dependencyScope = getScope(dependencyStep);
  const partIds = order.order_parts.map((part: any) => part.id);

  if (dependencyScope !== 'per_part') {
    return isStepStartedOrDone({
      orderId: order.id,
      step: dependencyStep
    });
  }

  if (partIds.length === 0) return false;

  const readyExecutions = await prisma.step_execution.findMany({
    where: {
      order_id: order.id,
      step_type: dependencyStep as step_name,
      order_part_id: {
        in: partIds
      },
      status: {
        in: [...READY_STATUSES]
      }
    },
    select: {
      order_part_id: true
    }
  });

  const readyPartIds = new Set(
    readyExecutions.map((execution) => execution.order_part_id)
  );

  return partIds.every((partId: string) => readyPartIds.has(partId));
};

export const validateStepCanStart = async (ctx: {
  tx: any;
  order: any;
  role: employee_role;
  step: OrderStatusV2;
  orderPartId: string;
}) => {
  const { tx, order, role, step, orderPartId } = ctx;

  try {
    assertRoleCanAccessStep(role, step);
  } catch {
    throw new HttpError('Role not allowed for this step', 403);
  }

  const scope = stepScope[step as WorkflowStep];

  const currentExecution = await findCurrentExecution({
    tx,
    order,
    step,
    orderPartId
  });

  if (currentExecution?.status === 'active') {
    throw new HttpError('Step already active', 409);
  }

  if (currentExecution?.status === 'done') {
    throw new HttpError('Step already done', 409);
  }

  if (currentExecution?.status === 'paused') {
    throw new HttpError('Step is paused. Resume it instead', 409);
  }

  const dependencies = getStepDependencies(order, step);

  if (scope === 'per_part') {
    for (const dependencyStep of dependencies) {
      const dependencyExecution = await tx.step_execution.findFirst({
        where: {
          order_id: order.id,
          order_part_id: orderPartId,
          step_type: dependencyStep,
          status: {
            in: [...READY_STATUSES]
          }
        }
      });

        if (!dependencyExecution) {
        throw new HttpError(
          `Cannot start ${step}. Variant has not started, paused or finished ${dependencyStep}`,
          409
        );
      }
    }

    return;
  }

  if (scope === 'aggregated') {
    const orderParts = await getOrderParts(tx, order.id);

    for (const dependencyStep of dependencies) {
      const readyExecutions = await tx.step_execution.findMany({
        where: {
          order_id: order.id,
          step_type: dependencyStep,
          order_part_id: {
            in: orderParts.map((part: any) => part.id)
          },
          status: {
            in: [...READY_STATUSES]
          }
        },
        select: {
          order_part_id: true
        }
      });

      const readyPartIds = new Set(
        readyExecutions.map((execution: any) => execution.order_part_id)
      );

      const allVariantsReady = orderParts.every((part: any) =>
        readyPartIds.has(part.id)
      );

        if (!allVariantsReady) {
        throw new HttpError(
          `Cannot start ${step}. All variants must be active, paused or done in ${dependencyStep}`,
          409
        );
      }
    }

    return;
  }

  if (scope === 'per_order') {
    for (const dependencyStep of dependencies) {
      const dependencyScope = stepScope[dependencyStep];

      if (dependencyScope === 'per_part') {
        const orderParts = await getOrderParts(tx, order.id);

        const readyExecutions = await tx.step_execution.findMany({
          where: {
            order_id: order.id,
            step_type: dependencyStep,
            order_part_id: {
              in: orderParts.map((part: any) => part.id)
            },
            status: {
              in: [...READY_STATUSES]
            }
          },
          select: {
            order_part_id: true
          }
        });

        const readyPartIds = new Set(
          readyExecutions.map((execution: any) => execution.order_part_id)
        );

        const allVariantsReady = orderParts.every((part: any) =>
          readyPartIds.has(part.id)
        );

        if (!allVariantsReady) {
          throw new HttpError(
            `Cannot start ${step}. All variants must be active, paused or done in ${dependencyStep}`,
            409
          );
        }

        continue;
      }

      const dependencyExecution = await tx.step_execution.findFirst({
        where: {
          order_id: order.id,
          step_type: dependencyStep,
          status: {
            in: [...READY_STATUSES]
          }
        }
      });

      if (!dependencyExecution) {
        throw new HttpError(
          `Cannot start ${step}. Previous step ${dependencyStep} is not active, paused or done`,
          409
        );
      }
    }
  }
};
