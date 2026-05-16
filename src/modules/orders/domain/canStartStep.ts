import { OrderStatusV2, ProductTypeV2 } from '../../../types/orderStatus'
import { stepScope, workflow } from '../orders.workflow';
import { order } from '@prisma/client';

const READY_STATUSES = ['active', 'done'] as const;
const BLOCKING_STATUSES = ['active', 'done'] as const;
/*

export const canStartStepV2 = async (ctx: { tx: any; order: order; step: OrderStatusV2; orderPartId: string; }) => {
  const { tx, order, step, orderPartId } = ctx;

  const productType = order.product_type as ProductTypeV2;
  const currentStep = step as OrderStatusV2;

  const scope = stepScope[currentStep];
  const dependencies = workflow[productType]?.[currentStep] ?? [];

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
        return false;
      }
    }

    return true;
  }

  if (scope === 'aggregated') {
    const orderParts = await tx.order_parts.findMany({
      where: {
        order_id: order.id
      },
      select: {
        id: true
      }
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
        return false;
      }
    }

    return true;
  }

  if (scope === 'per_order') {
    for (const dependencyStep of dependencies) {
      const dependencyScope = stepScope[dependencyStep];

      if (dependencyScope === 'per_part') {
        const orderParts = await tx.order_parts.findMany({
          where: {
            order_id: order.id
          },
          select: {
            id: true
          }
        });

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
          return false;
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
        return false;
      }
    }

    return true;
  }

  return false;
}; */