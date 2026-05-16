import { workflow, stepScope } from "../modules/orders/orders.workflow";

export type ProductType =
  | 'hardcover_book'
  | 'perfect_bound_book'
  | 'saddle_stitching';

export const ORDER_STATUSES: OrderStatus[] = [
  'printing',
  'folding',
  'folding_with_milling',
  'sewing',
  'case_making',
  'hardcover_binding',
  'binding',
  'stitching'
];


export type OrderStatus =
  'printing' |
  'folding' |
  'folding_with_milling' |
  'sewing' |
  'case_making' |
  'hardcover_binding' |
  'binding' |
  'stitching';

export type WorkflowV2 = typeof workflow;

export type ProductTypeV2 = keyof WorkflowV2;

export type OrderStatusV2<T extends ProductTypeV2 = ProductTypeV2> =
  keyof WorkflowV2[T];


export type RoleAccessV2<T extends ProductTypeV2 = ProductTypeV2> =
  | { type: 'ALL' }
  | { type: 'LIMITED'; steps: OrderStatusV2<T>[] };

export type StepState = 'NOT_STARTED' | 'ACTIVE' | 'DONE';

export type OrderStateV2<T extends ProductTypeV2 = ProductTypeV2> =
  Record<OrderStatusV2<T>, StepState>;

export type partVariant = 'V4' | 'V8' | 'V16'| 'V24' | 'V32' | 'V64'
export type WorkflowProductType = keyof typeof workflow;
export type WorkflowStep = keyof typeof stepScope;
export type WorkflowMap = Partial<Record<OrderStatus, OrderStatus[]>>;
export type EventType = 'START' | 'END';
