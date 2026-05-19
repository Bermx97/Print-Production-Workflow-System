import { roleStatusMap } from "../../orders.workflow";
import { employee_role } from "@prisma/client";
import { WorkflowMap, OrderStatus } from "../../../../types/orderStatus";

export const getRoleSteps = (role: employee_role, wf: WorkflowMap) => {
  const access = roleStatusMap[role];

  if (!access) return [];

  if (access.type === 'ALL') {
    return Object.keys(wf) as OrderStatus[];
  }

  return access.steps.filter((step) => wf[step]);

};