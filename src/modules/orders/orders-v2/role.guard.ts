import { employee_role } from "@prisma/client";
import { roleStatusMap } from "../orders.workflow";
import { HttpError } from "../../../utils/errors";

export const assertRoleCanAccessStep = (
  role: employee_role,
  step: string
) => {

  const access = roleStatusMap[role];

  // pełny dostęp (admin/seller/technologist)
  if (access.type === "ALL") return;

  // ograniczony dostęp
  if (!access.steps.includes(step)) {
    throw new HttpError(
      `Role ${role} cannot access step ${step}`,
      403
    );
  }
};