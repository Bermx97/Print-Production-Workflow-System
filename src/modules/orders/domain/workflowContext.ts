import { workflow } from '../orders.workflow';
import { WorkflowProductType, OrderStatusV2, WorkflowStep, WorkflowMap } from '../../../types/orderStatus'
import { HttpError } from '../../../utils/errors';
import { employee_role } from '@prisma/client';
import { assertRoleCanAccessStep } from './roleGuard';
import { stepScope } from '../orders.workflow';


export const READY_STATUSES = ['active', 'done'] as const;


export const getScope = (step: string) => stepScope[step as WorkflowStep];

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





