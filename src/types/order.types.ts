import type { Prisma } from '@prisma/client';

export type OrderWithParts = Prisma.orderGetPayload<{
  include: {
    order_parts: true;
  };
}>;