import { OrderStatusV2 } from '../../../types/orderStatus';
import { ProductType } from '../../../types/orderStatus';
import { OrderStatus } from '../../../types/orderStatus';
import { HttpError } from '../../../utils/errors';
import { assertRoleCanAccessStep } from '../domain/roleGuard';
import { READY_STATUSES } from '../domain/workflowContext';
import { getPartsForStep, isPartApplicableToStep, stepScope, workflow } from '../orders.workflow';
import type { Prisma } from '@prisma/client';
import { employee_role } from '@prisma/client';
import type { order as Order } from '@prisma/client';

export const handleStart = async (ctx: {
  tx: Prisma.TransactionClient;
  order: Order;
  userId: string;
  role: employee_role;
  step: OrderStatusV2;
  orderPartId: string;
}) => {
  const { tx, order, userId, role, step, orderPartId } = ctx;

  try {
    assertRoleCanAccessStep(role, step);
  } catch {
    throw new HttpError('Role not allowed for this step', 403);
  }

  const scope = stepScope[step as OrderStatus];

  if (scope === 'per_part' && !orderPartId) {
    throw new HttpError('Order part required for this step', 400);
  }

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
  }

  if (scope === 'aggregated') {
    const productType = order.product_type as ProductType;
    const currentStep = step as OrderStatus;

    const dependencies = workflow[productType]?.[currentStep] ?? [];

    const allOrderParts = await tx.order_parts.findMany({
      where: { order_id: order.id },
      select: { id: true, variant: true }
    });

    for (const dependencyStep of dependencies) {
      const orderParts = getPartsForStep(allOrderParts, dependencyStep);

      const readyExecutions = await tx.step_execution.findMany({
        where: {
          order_id: order.id,
          step_type: dependencyStep,
          order_part_id: {
            in: orderParts.map((part) => part.id)
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

      const allVariantsReady = orderParts.every((part) =>
        readyPartIds.has(part.id)
      );

      if (!allVariantsReady) {
        throw new HttpError(
          `Cannot start ${step} until all variants in ${dependencyStep} are active, paused or done`,
          409
        );
      }
    }
  }

  const effectiveOrderPartId = scope === 'per_part' ? orderPartId : null;

  const lastLog = await tx.step_logs.findFirst({
    where: {
      order_id: order.id,
      order_part_id: effectiveOrderPartId,
      step_name: step
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  if (lastLog?.event_type === 'START') {
    throw new HttpError('Step already active', 409);
  }

  const log = await tx.step_logs.create({
    data: {
      order_id: order.id,
      order_part_id: effectiveOrderPartId,
      employee: userId,
      step_name: step,
      event_type: 'START'
    }
  });

  const execution = await tx.step_execution.create({
    data: {
      order_id: order.id,
      step_type: step,
      step_scope: scope,
      status: 'active',
      started_at: new Date(),

      ...(scope === 'per_part' ? { order_part_id: orderPartId } : {})
    }
  });

  return { log, execution };
};
