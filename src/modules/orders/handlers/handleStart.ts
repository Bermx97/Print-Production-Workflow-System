import { OrderStatusV2 } from '../../../types/orderStatus';
import { ProductType } from '../../../types/orderStatus';
import { OrderStatus } from '../../../types/orderStatus';
import { HttpError } from '../../../utils/errors';
import { assertRoleCanAccessStep } from '../domain/roleGuard';
import { stepScope, workflow } from '../orders.workflow';

const READY_STATUSES = ['active', 'done'] as const;

export const handleStart = async (ctx: {
  tx: any;
  order: any;
  userId: string;
  role: any;
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

  if (scope === 'aggregated') {
    const productType = order.product_type as ProductType;
    const currentStep = step as OrderStatus;

    const dependencies = workflow[productType]?.[currentStep] ?? [];

    const orderParts = await tx.order_parts.findMany({
      where: { order_id: order.id },
      select: { id: true }
    });

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
          `Cannot start ${step} until all variants in ${dependencyStep} are active or done`,
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


const canStartStepV2 = async (ctx: {
  tx: any;
  order: any;
  step: OrderStatusV2;
  orderPartId: string;
}) => {
  const { tx, order, step, orderPartId } = ctx;

  const currentStep = step as OrderStatus;
  const productType = order.product_type as ProductType;

  const scope = stepScope[currentStep];
  const dependencies = workflow[productType]?.[currentStep] ?? [];

  if (dependencies.length === 0) {
    return true;
  }

  if (scope === 'per_part') {
    for (const dependencyStep of dependencies) {
      const dependencyExecution = await tx.step_execution.findFirst({
        where: {
          order_id: order.id,
          order_part_id: orderPartId,
          step_type: dependencyStep,
          status: { in: [...READY_STATUSES] }
        }
      });

      if (!dependencyExecution) {
        return false;
      }
    }

    return true;
  }

  if (scope === 'aggregated') {
    const orderParts = await tx.order_parts.findMany({
      where: { order_id: order.id },
      select: { id: true }
    });

    for (const dependencyStep of dependencies) {
      const readyExecutions = await tx.step_execution.findMany({
        where: {
          order_id: order.id,
          step_type: dependencyStep,
          order_part_id: {
            in: orderParts.map((part: any) => part.id)
          },
          status: { in: [...READY_STATUSES] }
        },
        select: { order_part_id: true }
      });

      const readyPartIds = new Set(
        readyExecutions.map((execution: any) => execution.order_part_id)
      );

      const allVariantsReady = orderParts.every((part: any) =>
        readyPartIds.has(part.id)
      );

      if (!allVariantsReady) {
        return false;
      }
    }

    return true;
  }

  if (scope === 'per_order') {
    for (const dependencyStep of dependencies) {
      const dependencyScope = stepScope[dependencyStep];

      if (dependencyScope === 'aggregated' || dependencyScope === 'per_order') {
        const dependencyExecution = await tx.step_execution.findFirst({
          where: {
            order_id: order.id,
            step_type: dependencyStep,
            status: { in: [...READY_STATUSES] }
          }
        });

        if (!dependencyExecution) {
          return false;
        }
      }
    }

    return true;
  }

  return false;
};

