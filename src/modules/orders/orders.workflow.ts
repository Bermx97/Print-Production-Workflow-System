import { order_status, employee_role } from '@prisma/client';


export type RoleAccess =
  | { type: "STEP"; step: order_status }
  | { type: "ALL" };


  export const roleStatusMap: Record<employee_role, RoleAccess> = {
  printer: { type: "STEP", step: "printing" },
  cutter: { type: "STEP", step: "cutting" },
  gluer: { type: "STEP", step: "gluing" },

  seller: { type: 'ALL'},

  technologist: { type: "ALL" },
  admin: { type: "ALL" }
};

export const workflow: Record<order_status, order_status[]> = {
  [order_status.printing]: [],
  [order_status.cutting]: [order_status.printing],
  [order_status.gluing]: [order_status.printing],
  done: []
};





