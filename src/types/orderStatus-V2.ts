import { workflow } from '../modules/orders/orders.workflow';
import { employee_role } from "@prisma/client";

export type WorkflowV2 = typeof workflow;

export type ProductTypeV2 = keyof WorkflowV2;

export type OrderStatusV2<T extends ProductTypeV2 = ProductTypeV2> =
  keyof WorkflowV2[T];


export type RoleAccessV2<T extends ProductTypeV2 = ProductTypeV2> =
  | { type: "ALL" }
  | { type: "LIMITED"; steps: OrderStatusV2<T>[] };

export type StepState = 'NOT_STARTED' | 'ACTIVE' | 'DONE';

export type OrderStateV2<T extends ProductTypeV2 = ProductTypeV2> =
  Record<OrderStatusV2<T>, StepState>;