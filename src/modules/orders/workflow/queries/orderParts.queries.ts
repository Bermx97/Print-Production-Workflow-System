import type { Prisma } from '@prisma/client';


export const getOrderParts = async (tx: Prisma.TransactionClient, orderId: string) => {
  return tx.order_parts.findMany({
    where: {
      order_id: orderId
    },
    select: {
      id: true,
      variant: true
    }
  });
}; 
