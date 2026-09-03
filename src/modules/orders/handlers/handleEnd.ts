import { OrderStatusV2 } from '../../../types/orderStatus';
import { assertRoleCanAccessStep } from '../domain/roleGuard';
import { HttpError } from '../../../utils/errors';
import { getPartsForStep, stepScope } from '../orders.workflow';
import { employee_role } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { product_type } from '@prisma/client';
import { OrderStatus } from '../../../types/orderStatus';
import type { order as Order } from '@prisma/client';
import { WorkflowMap } from '../../../types/orderStatus';




type WorkflowStep = keyof typeof stepScope;

const DONE_STATUS = 'done';

const getStepFromRole = (
  wf: Record<product_type, OrderStatus>,
  role: employee_role
): OrderStatusV2 => {
  const allSteps = Object.keys(wf) as OrderStatusV2[];

  const roleSteps = allSteps.filter((step) => {
    try {
      assertRoleCanAccessStep(role, step);
      return true;
    } catch {
      return false;
    }
  });

  if (roleSteps.length === 0) {
    throw new HttpError('Role not allowed for any step in this workflow', 403);
  }

  if (roleSteps.length > 1) {
    throw new HttpError('Step required for this role', 400);
  }

  return roleSteps[0];
};

const assertDependenciesDone = async (ctx: {
  tx: Prisma.TransactionClient;
  order: Order;
  wf: WorkflowMap;
  activeStep: OrderStatusV2;
  orderPartId: string;
}) => {
  const { tx, order, wf, activeStep, orderPartId } = ctx;
  const activeScope = stepScope[activeStep as WorkflowStep];
  const dependencies = wf[activeStep] ?? [];

  for (const dependencyStep of dependencies) {
    const dependencyScope = stepScope[dependencyStep as WorkflowStep];

    if (dependencyScope === 'per_part') {
      if (activeScope === 'per_part') {
        const doneExecution = await tx.step_execution.findFirst({
          where: {
            order_id: order.id,
            order_part_id: orderPartId,
            step_type: dependencyStep,
            status: DONE_STATUS
          }
        });

        if (!doneExecution) {
          throw new HttpError(
            `Cannot end ${activeStep}. Previous step ${dependencyStep} is not done for this variant`,
            409
          );
        }

        continue;
      }

      const allOrderParts = await tx.order_parts.findMany({
        where: {
          order_id: order.id
        },
        select: {
          id: true,
          variant: true
        }
      });
      const orderParts = getPartsForStep(allOrderParts, dependencyStep as WorkflowStep);

      const doneExecutions = await tx.step_execution.findMany({
        where: {
          order_id: order.id,
          step_type: dependencyStep,
          order_part_id: {
            in: orderParts.map((part) => part.id)
          },
          status: DONE_STATUS
        },
        select: {
          order_part_id: true
        }
      });

      const donePartIds = new Set(
        doneExecutions.map((execution) => execution.order_part_id)
      );

      const allVariantsDone = orderParts.every((part) =>
        donePartIds.has(part.id)
      );

      if (!allVariantsDone) {
        throw new HttpError(
          `Cannot end ${activeStep}. All variants must be done in ${dependencyStep}`,
          409
        );
      }

      continue;
    }

    const doneExecution = await tx.step_execution.findFirst({
      where: {
        order_id: order.id,
        step_type: dependencyStep,
        status: DONE_STATUS
      }
    });

    if (!doneExecution) {
      throw new HttpError(
        `Cannot end ${activeStep}. Previous step ${dependencyStep} is not done`,
        409
      );
    }
  }
};

export const handleEnd = async (ctx: {
  tx: Prisma.TransactionClient;
  order: Order;
  userId: string;
  role: employee_role;
  wf: Record<string, any>;
  doneQuantity: number;
  orderPartId: string;
}) => {
  const { tx, order, userId, role, wf, doneQuantity, orderPartId } = ctx;

  const activeStep = getStepFromRole(wf, role);
  const scope = stepScope[activeStep as WorkflowStep];

  if (scope === 'per_part' && !orderPartId) {
    throw new HttpError('Order part required for this step', 400);
  }

  const execution = await tx.step_execution.findFirst({
    where: {
      order_id: order.id,
      step_type: activeStep,
      status: 'active',

      ...(scope === 'per_part'
        ? { order_part_id: orderPartId }
        : { order_part_id: null })
    },
    orderBy: {
      started_at: 'desc'
    }
  });

  if (!execution) {
    const latestExecution = await tx.step_execution.findFirst({
      where: {
        order_id: order.id,
        step_type: activeStep,
        ...(scope === 'per_part'
          ? { order_part_id: orderPartId }
          : { order_part_id: null })
      },
      orderBy: {
        started_at: 'desc'
      }
    });

    if (latestExecution?.status === 'paused') {
      throw new HttpError('Step is paused. Resume it before ending', 409);
    }

    if (latestExecution?.status === 'done') {
      throw new HttpError('Step already done', 409);
    }

    throw new HttpError('No active execution found', 409);
  }

  await assertDependenciesDone({
    tx,
    order,
    wf,
    activeStep,
    orderPartId
  });

  const endLog = await tx.step_logs.create({
    data: {
      order_id: order.id,
      employee: userId,
      order_part_id: scope === 'per_part' ? orderPartId : null,
      step_name: activeStep,
      event_type: 'END'
    }
  });

  const updatedExecution = await tx.step_execution.update({
    where: {
      id: execution.id
    },
    data: {
      status: 'done',
      done_quantity: doneQuantity,
      finished_at: new Date()
    }
  });

  return {
    endLog,
    updatedExecution
  };
};
