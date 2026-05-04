import { workflow } from './orders.workflow';
import { Prisma, order } from "@prisma/client";
import { RoleAccess } from './orders.workflow';

export const canWorkOnOrder = (order:order, access: RoleAccess) => {
  const done = order.completed_steps;

  if (access.type === "ALL") return true;

  const step = access.step;
  const deps = workflow[step] || [];

  return (
    !done.includes(step) &&
    deps.every(dep => done.includes(dep))
  );
};