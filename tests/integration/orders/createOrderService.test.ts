import { beforeEach, describe, expect, it } from '@jest/globals';
import prisma from '../../../src/lib/prisma';
import { createOrderService } from '../../../src/modules/orders/orders.service';
import { getAuthToken } from '../../utils/auth';

describe('createOrderService', () => {
  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE "order", "employee" RESTART IDENTITY CASCADE;
    `);
  });

  it('should roll back order when creating parts fails', async () => {
    const { user } = await getAuthToken();
    const orderNumber = 987654;

    const data = {
      order_number: orderNumber,
      due_date: new Date('2026-10-01'),
      product_type: 'hardcover_book' as const,
      createdBy: {
        connect: {
          id: user.id
        }
      },
      quantity: 1000,
      customer: 'Test Customer',
      number_of_pages: 200
    };

    const invalidParts = [
      {
        variant: 'INVALID_VARIANT' as any,
        runs: 1,
        part_quantity: 1000
      }
    ];

    await expect(
      createOrderService(data, invalidParts)
    ).rejects.toThrow();

    const savedOrder = await prisma.order.findUnique({
      where: {
        order_number: orderNumber
      }
    });

    expect(savedOrder).toBeNull();
  });
});
