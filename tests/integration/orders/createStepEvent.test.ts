import prisma from '../../../src/lib/prisma';
import { createStepEventV2 } from '../../../src/modules/orders/orders.service';
import { HttpError } from '../../../src/utils/errors';
import { expect, test, describe, it, beforeEach, afterEach } from "@jest/globals";
import { createOrder } from '../../utils/order';
import { getAuthToken } from '../../utils/auth';
import { employee_role } from '@prisma/client';

describe('createStepEventV2', () => {
  let order: Awaited<ReturnType<typeof createOrder>>['order'];
  let orderPartId: string;
  let printerId: string
  let printerRole: employee_role

  beforeEach(async () => {
    const { user: printer } = await getAuthToken('printer_operator')
    printerId = printer.id
    printerRole = printer.role

    const created = await createOrder('hardcover_book');
    order = created.order
    orderPartId = created.parts[0].id;
  });

  afterEach(async () => {
    await prisma.step_logs.deleteMany();
    await prisma.step_execution.deleteMany();
    await prisma.order_parts.deleteMany();
    await prisma.order.deleteMany();
  });

  it('should start printing step', async () => {
    const result = await createStepEventV2(
      order.order_number,
      printerId,
      printerRole,
      'START',
      orderPartId
    );

    expect(result).toBeDefined();

    const execution = await prisma.step_execution.findFirst({
      where: {
        order_id: order.id,
        order_part_id: orderPartId,
        step_type: 'printing'
      }
    });

    expect(execution).not.toBeNull();
    expect(execution?.status).toBe('active');
  });

  it('should create START log', async () => {
    await createStepEventV2(
        order.order_number,
        printerId,
        printerRole,
        'START',
        orderPartId
    );

    const log = await prisma.step_logs.findFirst({
      where: {
        order_id: order.id,
        event_type: 'START'
      }
    });

    expect(log).not.toBeNull();
    expect(log?.step_name).toBe('printing');
  });

  it('should throw when order does not exist', async () => {
    await expect(
      createStepEventV2(
        999999,
        printerId,
        printerRole,
        'START',
        orderPartId

      )
    ).rejects.toThrow(HttpError);
  });

  it('should throw when END has no quantity', async () => {
    await expect(
      createStepEventV2(
        order.order_number,
        printerId,
        printerRole,
        'END',
        orderPartId

      )
    ).rejects.toThrow('Step quantity required');
  });

  it('should not allow starting same step twice', async () => {
    await createStepEventV2(
      order.order_number,
      printerId,
      printerRole,
      'START',
      orderPartId
    );

    await expect(
      createStepEventV2(
        order.order_number,
        'user-1',
        'printer_operator',
        'START',
        orderPartId
      )
    ).rejects.toThrow();
  });

  it('should block folding before printing', async () => {
    const { user: folding } = await getAuthToken('folding_operator')
    await expect(
      createStepEventV2(
        order.order_number,
        folding.id,
        folding.role,
        'START',
        orderPartId
      )
    ).rejects.toThrow();
  });

  it('should allow folding after printing started', async () => {
    
    await createStepEventV2(
      order.order_number,
      printerId,
      printerRole,
      'START',
      orderPartId
    );

    const { user: folding } = await getAuthToken('folding_operator')
    const result = await createStepEventV2(
      order.order_number,
      folding.id,
      folding.role,
      'START',
      orderPartId
    );

    expect(result).toBeDefined();

    const execution = await prisma.step_execution.findFirst({
      where: {
        order_id: order.id,
        order_part_id: orderPartId,
        step_type: 'folding'
      }
    });

    expect(execution).not.toBeNull();
    expect(execution?.status).toBe('active');
  });

  it('should reject invalid event type', async () => {
    await expect(
      createStepEventV2(
        order.order_number,
        printerId,
        printerRole,
        'INVALID' as any,
      orderPartId
      )
    ).rejects.toThrow('Invalid event type');
  });

  it('should not create duplicate executions', async () => {
  await createStepEventV2(
    order.order_number,
    printerId,
    printerRole,
    'START',
    orderPartId
  );

  await expect(
    createStepEventV2(
      order.order_number,
      printerId,
      printerRole,
      'START',
      orderPartId
    )
  ).rejects.toThrow();

  const executions = await prisma.step_execution.findMany({
    where: {
      order_id: order.id,
      order_part_id: orderPartId,
      step_type: 'printing'
    }
  });

  expect(executions.length).toBe(1);
});

  it('should pause active printing step', async () => {
    await createStepEventV2(
      order.order_number,
      printerId,
      printerRole,
      'START',
      orderPartId
    );

    const result = await createStepEventV2(
      order.order_number,
      printerId,
      printerRole,
      'PAUSE',
      orderPartId
    );

    expect(result).toBeDefined();

    const execution = await prisma.step_execution.findFirst({
      where: {
        order_id: order.id,
        order_part_id: orderPartId,
        step_type: 'printing'
      }
    });

    const log = await prisma.step_logs.findFirst({
      where: {
        order_id: order.id,
        order_part_id: orderPartId,
        step_name: 'printing',
        event_type: 'PAUSE'
      }
    });

    expect(execution?.status).toBe('paused');
    expect(log).not.toBeNull();
  });

  it('should resume paused printing step', async () => {
    await createStepEventV2(
      order.order_number,
      printerId,
      printerRole,
      'START',
      orderPartId
    );

    await createStepEventV2(
      order.order_number,
      printerId,
      printerRole,
      'PAUSE',
      orderPartId
    );

    const result = await createStepEventV2(
      order.order_number,
      printerId,
      printerRole,
      'RESUME',
      orderPartId
    );

    expect(result).toBeDefined();

    const execution = await prisma.step_execution.findFirst({
      where: {
        order_id: order.id,
        order_part_id: orderPartId,
        step_type: 'printing'
      }
    });

    const log = await prisma.step_logs.findFirst({
      where: {
        order_id: order.id,
        order_part_id: orderPartId,
        step_name: 'printing',
        event_type: 'RESUME'
      }
    });

    expect(execution?.status).toBe('active');
    expect(log).not.toBeNull();
  });

  it('should allow folding after printing paused', async () => {
    await createStepEventV2(
      order.order_number,
      printerId,
      printerRole,
      'START',
      orderPartId
    );

    await createStepEventV2(
      order.order_number,
      printerId,
      printerRole,
      'PAUSE',
      orderPartId
    );

    const { user: folding } = await getAuthToken('folding_operator');

    const result = await createStepEventV2(
      order.order_number,
      folding.id,
      folding.role,
      'START',
      orderPartId
    );

    expect(result).toBeDefined();

    const execution = await prisma.step_execution.findFirst({
      where: {
        order_id: order.id,
        order_part_id: orderPartId,
        step_type: 'folding'
      }
    });

    expect(execution?.status).toBe('active');
  });

  it('should not allow ending folding while printing is paused', async () => {
    await createStepEventV2(
      order.order_number,
      printerId,
      printerRole,
      'START',
      orderPartId
    );

    await createStepEventV2(
      order.order_number,
      printerId,
      printerRole,
      'PAUSE',
      orderPartId
    );

    const { user: folding } = await getAuthToken('folding_operator');

    await createStepEventV2(
      order.order_number,
      folding.id,
      folding.role,
      'START',
      orderPartId
    );

    await expect(
      createStepEventV2(
        order.order_number,
        folding.id,
        folding.role,
        'END',
        orderPartId,
        100
      )
    ).rejects.toThrow('Previous step printing is not done for this variant');
  });

  it('should resume paused step on START', async () => {
    await createStepEventV2(
      order.order_number,
      printerId,
      printerRole,
      'START',
      orderPartId
    );

    await createStepEventV2(
      order.order_number,
      printerId,
      printerRole,
      'PAUSE',
      orderPartId
    );

    const result = await createStepEventV2(
      order.order_number,
      printerId,
      printerRole,
      'START',
      orderPartId
    );

    expect(result).toBeDefined();

    const execution = await prisma.step_execution.findFirst({
      where: {
        order_id: order.id,
        order_part_id: orderPartId,
        step_type: 'printing'
      }
    });

    const lastLog = await prisma.step_logs.findFirst({
      where: {
        order_id: order.id,
        order_part_id: orderPartId,
        step_name: 'printing'
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    expect(execution?.status).toBe('active');
    expect(lastLog?.event_type).toBe('RESUME');
  });

  it('should not pause step before start', async () => {
    await expect(
      createStepEventV2(
        order.order_number,
        printerId,
        printerRole,
        'PAUSE',
        orderPartId
      )
    ).rejects.toThrow('No active execution found');
  });

    it('should finish printing step', async () => {
    await createStepEventV2(
        order.order_number,
        printerId,
        printerRole,
        'START',
        orderPartId
    );

    const result = await createStepEventV2(
        order.order_number,
        printerId,
        printerRole,
        'END',
        orderPartId,
        1000
    );

    expect(result).toBeDefined();

    const execution = await prisma.step_execution.findFirst({
        where: {
        order_id: order.id,
        order_part_id: orderPartId,
        step_type: 'printing'
        }
    });

    expect(execution?.status).toBe('done');
    });

    it('should not finish step before start', async () => {
    await expect(
        createStepEventV2(
        order.order_number,
        printerId,
        printerRole,
        'END',
        orderPartId,
        100
        )
    ).rejects.toThrow();
    });

    it('should reject unauthorized role', async () => {
    const { user: sewing } = await getAuthToken('sewing_operator');

    await expect(
        createStepEventV2(
        order.order_number,
        sewing.id,
        sewing.role,
        'START',
        orderPartId
        )
    ).rejects.toThrow();
    });
});

