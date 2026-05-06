

export type ProductType =
  | "hardcover_book"
  | "perfect_bound_book"
  | "saddle_stitching";

export const ORDER_STATUSES: OrderStatus[] = [
  "printing",
  "folding",
  "folding_with_milling",
  "sewing",
  "case_making",
  "hardcover_binding",
  "binding",
  "stitching"
];


export type OrderStatus =
  "printing" |
  "folding" |
  "folding_with_milling" |
  "sewing" |
  "case_making" |
  "hardcover_binding" |
  "binding" |
  "stitching";
