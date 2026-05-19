
export const getOrderParts = async (tx: any, orderId: string) => {
  return tx.order_parts.findMany({
    where: {
      order_id: orderId
    },
    select: {
      id: true
    }
  });
};