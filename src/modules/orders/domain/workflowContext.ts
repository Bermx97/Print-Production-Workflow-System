import { workflow } from '../orders.workflow';
import { WorkflowProductType, OrderStatusV2, WorkflowStep, WorkflowMap } from '../../../types/orderStatus'
import { HttpError } from '../../../utils/errors';
import { employee_role } from '@prisma/client';
import { assertRoleCanAccessStep } from './roleGuard';
import { stepScope } from '../orders.workflow';



export const getWorkflow = (order: any) => {
  const productType = order.product_type as WorkflowProductType;
  const wf = workflow[productType as WorkflowProductType];

  if (!wf) {
    throw new HttpError('Workflow not found', 500);
  }

  return wf;
};

export const getWorkflowMap = (productType: string): WorkflowMap | undefined => {
  return workflow[productType as WorkflowProductType];
}; 

export const getStepFromRole = (
  wf: ReturnType<typeof getWorkflow>,
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

export const getStepDependencies = (order: any, step: OrderStatusV2) => {
  const wf = getWorkflow(order);
  return (wf[step as keyof typeof wf] ?? []) as WorkflowStep[];
};

export const getOrderParts = async (tx: any, orderId: string) => {
  return tx.order_parts.findMany({
    where: {
      order_id: orderId
    },
    select: {
      id: true
    }
  });
};

const READY_STATUSES = ['active', 'done'] as const;

export const findCurrentExecution = async (ctx: {
  tx: any;
  order: any;
  step: OrderStatusV2;
  orderPartId: string;
}) => {
  const { tx, order, step, orderPartId } = ctx;
  const scope = stepScope[step as WorkflowStep];

  return tx.step_execution.findFirst({
    where: {
      order_id: order.id,
      step_type: step,
      status: {
        in: [...READY_STATUSES]
      },

      ...(scope === 'per_part'
        ? { order_part_id: orderPartId }
        : {})
    },
    orderBy: {
      started_at: 'desc'
    }
  });
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
          `Cannot start ${step}. Variant has not started or finished ${dependencyStep}`,
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
          `Cannot start ${step}. All variants must be active or done in ${dependencyStep}`,
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
            `Cannot start ${step}. All variants must be active or done in ${dependencyStep}`,
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
          `Cannot start ${step}. Previous step ${dependencyStep} is not active or done`,
          409
        );
      }
    }
  }
};


