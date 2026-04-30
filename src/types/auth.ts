import { employee_role } from "@prisma/client";

export type AuthUser = {
  id: string;
  role: employee_role;
};