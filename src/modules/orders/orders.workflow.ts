import { employee_role } from '@prisma/client';
import { OrderStatus, ORDER_STATUSES, ProductType } from '../../types/orderStatus';



export type RoleAccess =
  | { type: "ALL" }
  | { type: "LIMITED"; steps: OrderStatus[] };



export const workflow: Record< ProductType, Partial<Record<OrderStatus, OrderStatus[]>>> = {

  hardcover_book: {
    printing: [],
    folding: ['printing'],
    sewing: ['folding'],
    case_making: ['folding'],
    hardcover_binding: ['sewing', 'case_making']
  },

  perfect_bound_book: {
    printing: [],
    folding_with_milling: ['printing'],
    binding: ['folding_with_milling']
  },

  saddle_stitching: {
    printing: [],
    folding: ['printing'],
    stitching: ['folding']
  }
};

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










