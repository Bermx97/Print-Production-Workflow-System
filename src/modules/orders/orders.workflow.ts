import { employee_role } from '@prisma/client';
import { OrderStatus, ORDER_STATUSES, ProductType } from '../../types/orderStatus';

export type RoleAccess =
  | { type: 'ALL' }
  | { type: 'LIMITED'; steps: OrderStatus[] };

export const workflow: Record< ProductType, Partial<Record<OrderStatus, OrderStatus[]>>> = {

  hardcover_book: {
    printing: [],
    folding: ['printing'],
    sewing: ['folding'],
    case_making: ['folding', 'printing'],
    hardcover_binding: ['sewing', 'case_making', 'printing']
  },

  perfect_bound_book: {
    printing: [],
    folding_with_milling: ['printing'],
    binding: ['folding_with_milling', 'printing']
  },

  saddle_stitching: {
    printing: [],
    folding: ['printing'],
    stitching: ['folding', 'printing']
  }
};

export const stepScope = {
  printing: 'per_part',
  folding: 'per_part',
  folding_with_milling: 'per_part',
  sewing: 'aggregated',
  case_making: 'aggregated',
  hardcover_binding: 'per_order',
  binding: 'per_order',
  stitching: 'per_order'
} as const;

export const COVER_VARIANT = 'COVER';

export const ORDER_PART_VARIANTS = [
  'V4',
  'V8',
  'V16',
  'V24',
  'V32',
  'V64',
  COVER_VARIANT
] as const;

export const variantExclusions: Partial<Record<OrderStatus, readonly string[]>> = {
  folding: [COVER_VARIANT],
  folding_with_milling: [COVER_VARIANT]
} as const;

type OrderPartLike = {
  variant?: string | null;
};

export function isPartApplicableToStep(part: OrderPartLike, step: OrderStatus) {
  return !variantExclusions[step]?.includes(String(part.variant ?? ''));
}

export function getPartsForStep<T extends OrderPartLike>(parts: T[], step: OrderStatus) {
  return parts.filter((part) => isPartApplicableToStep(part, step));
}

export const roleStatusMap: Record<employee_role, RoleAccess> = {
  printer_operator: { type: 'LIMITED', steps: ['printing'] },
  folding_operator: { type: 'LIMITED', steps: ['folding_with_milling', 'folding'] },
  sewing_operator: { type: 'LIMITED', steps: ['sewing'] },
  case_maker: { type:'LIMITED', steps: ['case_making'] },
  hardcover_binder_operator: { type:'LIMITED', steps: ['hardcover_binding'] },
  perfect_bound_operator: { type:'LIMITED', steps: ['binding'] },
  stitching_operator: {type: 'LIMITED', steps: ['stitching'] },
  

  seller: { type: 'ALL' },
  technologist: { type: 'ALL' },
  admin: { type: 'ALL' }
};

export function getWorkflow(productType: ProductType): OrderStatus[] {
  const graph = workflow[productType];

  const result: OrderStatus[] = [];
  const visited = new Set<OrderStatus>();

  function visit(step: OrderStatus) {
    if (visited.has(step)) return;

    const deps = graph?.[step] ?? [];

    deps.forEach(visit);

    visited.add(step);
    result.push(step);
  }

  Object.keys(graph).forEach(step => visit(step as OrderStatus));

  return result;
}
