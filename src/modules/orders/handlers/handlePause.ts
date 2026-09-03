import { HttpError } from '../../../utils/errors';
import { OrderStatus } from '../../../types/orderStatus';
import { stepScope } from '../orders.workflow';
import { getStepFromRole, getWorkflow } from '../domain/workflowContext';
import { employee_role } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { order as Order } from '@prisma/client';


export const handlePause = async (ctx: {
  tx: Prisma.TransactionClient;
  order: Order;
  userId: string;
  role: employee_role;
  orderPartId: string;
}) => {
  const { tx, order, userId, role, orderPartId } = ctx;
  const wf = getWorkflow(order);
  const activeStep = getStepFromRole(wf, role);
  const scope = stepScope[activeStep as OrderStatus];

  if (scope === 'per_part' && !orderPartId) {
    throw new HttpError('Order part required for this step', 400);
  }

  const execution = await tx.step_execution.findFirst({
    where: {
      order_id: order.id,
      step_type: activeStep,
      status: 'active',
      ...(scope === 'per_part'
        ? { order_part_id: orderPartId }
        : { order_part_id: null })
    },
    orderBy: {
      started_at: 'desc'
    }
  });

  if (!execution) {
    const latestExecution = await tx.step_execution.findFirst({
      where: {
        order_id: order.id,
        step_type: activeStep,
        ...(scope === 'per_part'
          ? { order_part_id: orderPartId }
          : { order_part_id: null })
      },
      orderBy: {
        started_at: 'desc'
      }
    });

    if (latestExecution?.status === 'paused') {
      throw new HttpError('Step already paused', 409);
    }

    if (latestExecution?.status === 'done') {
      throw new HttpError('Step already done', 409);
    }

    throw new HttpError('No active execution found', 409);
  }

  const pauseLog = await tx.step_logs.create({
    data: {
      order_id: order.id,
      employee: userId,
      order_part_id: scope === 'per_part' ? orderPartId : null,
      step_name: activeStep,
      event_type: 'PAUSE'
    }
  });

  const updatedExecution = await tx.step_execution.update({
    where: {
      id: execution.id
    },
    data: {
      status: 'paused'
    }
  });

  return {
    pauseLog,
    updatedExecution
  };
};
