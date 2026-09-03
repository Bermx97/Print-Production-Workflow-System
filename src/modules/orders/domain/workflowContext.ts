import { workflow } from '../orders.workflow';
import { WorkflowProductType, OrderStatusV2, WorkflowStep, WorkflowMap } from '../../../types/orderStatus'
import { HttpError } from '../../../utils/errors';
import { employee_role } from '@prisma/client';
import { assertRoleCanAccessStep } from './roleGuard';
import { stepScope } from '../orders.workflow';
import type { order as Order } from '@prisma/client';
import { product_type } from '@prisma/client';
import { execution_status } from '@prisma/client';



export const READY_STATUSES = ['active', 'paused', 'done'] as const;
export const IN_PROGRESS_STATUSES: readonly execution_status[] = ['active', 'paused'];
export const BLOCK_START_STATUSES = ['active', 'paused', 'done'] as const;


export const getScope = (step: OrderStatusV2) => stepScope[step as WorkflowStep];

export const getWorkflow = (order: Order) => {
  const productType = order.product_type as WorkflowProductType;
  const wf = workflow[productType as WorkflowProductType];

  if (!wf) {
    throw new HttpError('Workflow not found', 500);
  }

  return wf;
};

export const getWorkflowMap = (productType: product_type): WorkflowMap | undefined => {
  return workflow[productType as WorkflowProductType];
};

export const getStepFromRole = (
  wf: WorkflowMap,
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

export const getStepDependencies = (order: Order, step: OrderStatusV2) => {
  const wf = getWorkflow(order);
  return (wf[step as keyof typeof wf] ?? []) as WorkflowStep[];
};





