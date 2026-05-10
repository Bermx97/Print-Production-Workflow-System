import { ProductType, OrderStatus } from '../../../types/orderStatus'

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
