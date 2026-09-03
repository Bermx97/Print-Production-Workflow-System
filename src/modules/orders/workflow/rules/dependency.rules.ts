import { step_name } from "@prisma/client";
import { HttpError } from "../../../../utils/errors";
import { READY_STATUSES } from "../../domain/workflowContext";
import { isStepStartedOrDone, findCurrentExecution, hasStartedOrFinishedExecution } from "../queries/execution.queries";
import { OrderStatus, WorkflowMap, OrderStatusV2, WorkflowStep } from "../../../../types/orderStatus";
import { getScope, getStepDependencies } from "../../domain/workflowContext";
import { employee_role } from "@prisma/client";
import { assertRoleCanAccessStep } from "../../domain/roleGuard";
import { getOrderParts } from "../queries/orderParts.queries";
import { getPartsForStep, isPartApplicableToStep, stepScope } from "../../orders.workflow";
import type { Prisma } from '@prisma/client';


export const validateStepCanStart = async (ctx: {
  tx: Prisma.TransactionClient;
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

  if (scope === 'per_part' && !orderPartId) {
    throw new HttpError('Order part required for this step', 400);
  }

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
    const orderPart = await tx.order_parts.findFirst({
      where: {
        id: orderPartId,
        order_id: order.id
      },
      select: {
        id: true,
        variant: true
      }
    });

    if (!orderPart) {
      throw new HttpError('Order part not found', 404);
    }

    if (!isPartApplicableToStep(orderPart, step as OrderStatus)) {
      throw new HttpError(`Cannot start ${step}. Variant is not used in this step`, 409);
    }

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
    const allOrderParts = await getOrderParts(tx, order.id);

    for (const dependencyStep of dependencies) {
      const orderParts = getPartsForStep(allOrderParts, dependencyStep as OrderStatus);

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
        const allOrderParts = await getOrderParts(tx, order.id);
        const orderParts = getPartsForStep(allOrderParts, dependencyStep as OrderStatus);

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


export const allPartsReadyInDependency = async (
  ctx: { order: any; dependencyStep: step_name; },
  executionsForOrder?: any[]
) => {
  const { order, dependencyStep } = ctx;
  const dependencyScope = getScope(dependencyStep);
  const partsForStep = getPartsForStep(order.order_parts, dependencyStep as OrderStatus);
  const partIds = partsForStep.map((part: any) => part.id);

  if (dependencyScope !== 'per_part') {
    return isStepStartedOrDone({
      orderId: order.id,
      step: dependencyStep
    }, executionsForOrder);
  }

  if (partIds.length === 0) return false;

  const results = await Promise.all(
    partIds.map((partId: string) => 
      isStepStartedOrDone({
        orderId: order.id,
        step: dependencyStep,
        orderPartId: partId
      }, executionsForOrder)
    )
  );

  return results.every(Boolean);
};

export const canStartStepForPart = async (
  ctx: { order: any; wf: WorkflowMap; step: step_name; orderPartId?: string | null; },
  executionsForOrder?: any[]
) => {
  const { order, wf, step, orderPartId } = ctx;
  const scope = getScope(step);

  if (scope === 'per_part' && orderPartId) {
    const orderPart = order.order_parts?.find((part: any) =>
      String(part.id) === String(orderPartId)
    );

    if (orderPart && !isPartApplicableToStep(orderPart, step as OrderStatus)) {
      return false;
    }
  }

  const alreadyStartedOrDone = await hasStartedOrFinishedExecution({
    orderId: order.id,
    step,
    orderPartId
  }, executionsForOrder);

  if (alreadyStartedOrDone) return false;

  const dependencies = wf[step as OrderStatus] ?? [];

  for (const dependencyStep of dependencies) {
    if (scope === 'per_part') {
      const dependencyReady = await isStepStartedOrDone({
        orderId: order.id,
        step: dependencyStep,
        orderPartId
      }, executionsForOrder);

      if (!dependencyReady) return false;

      continue;
    }

    const dependencyReady = await allPartsReadyInDependency({
      order,
      dependencyStep
    }, executionsForOrder);

    if (!dependencyReady) return false;
  }

  return true;
};
