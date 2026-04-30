import type { AuthUser } from "./auth";
import { employee_role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        login: string;
        role: employee_role;
      };
    }
  }
}

export {};