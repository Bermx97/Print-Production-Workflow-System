import { employee_role } from '@prisma/client';
import { roleStatusMap } from '../orders.workflow';
import { HttpError } from '../../../utils/errors';
import { OrderStatusV2 } from '../../../types/orderStatus';

export const assertRoleCanAccessStep = (
  role: employee_role,
  step: OrderStatusV2
) => {

  const access = roleStatusMap[role];

  if (access.type === 'ALL') return;

  if (!access.steps.includes(step)) {
    throw new HttpError(`Role ${role} cannot access step ${step}`, 403);
  }
};