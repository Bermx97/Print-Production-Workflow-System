import { jest, expect, describe, it } from "@jest/globals";
import { step_name, product_type, Variant } from '@prisma/client';
import { getOrderState } from '../../../src/modules/orders/workflow/state/orderState.service';
import { canStartStepForPart } from '../../../src/modules/orders/workflow/rules/dependency.rules';
import { WorkflowMap } from "../../../src/types/orderStatus";
import { OrderWithParts } from "../../../src/types/order.types";
import { step_execution } from "@prisma/client";



jest.mock('../../../src/modules/orders/domain/workflowContext', () => {
  const originalModule = jest.requireActual<typeof import('../../../src/modules/orders/domain/workflowContext')>('../../../src/modules/orders/domain/workflowContext');;
  return {
    __esModule: true,
    ...originalModule,
    getScope: (step: step_name) => (step === 'folding' ? 'per_part' : 'global'),
  };
});

describe('Workflow V2 Optimization - Unit Tests', () => {
  const mockWorkflow: WorkflowMap = {
    printing: [],
    folding: ['printing'],
    sewing: ['folding']
  };

  const mockOrder: OrderWithParts = {
    id: 'order-1',
    order_number: 123,
    due_date: new Date(),
    created_by: 'user-1',
    product_type: 'hardcover_book',
    quantity: 1000,
    customer: 'Test Customer',
    number_of_pages: 200,

    order_parts: [
      {
        id: 'part-1',
        order_id: 'order-1',
        variant: 'V16',
        runs: 1,
        part_quantity: 1000
      },
      {
        id: 'part-2',
        order_id: 'order-1',
        variant: 'V32',
        runs: 1,
        part_quantity: 1000
      }
    ]
  };

  const mockOrderWithCover = {
    id: '456',
    product_type: 'hardcover_book',
    order_parts: [
      { id: 'part-1', variant: 'V16' },
      { id: 'part-2', variant: 'V32' },
      { id: 'cover', variant: 'COVER' }
    ]
  } as unknown as OrderWithParts;

  describe('getOrderState', () => {
    it('should set ACTIVE state when at least one execution is active', async () => {
      const mockExecutions = [
        { step_type: 'printing', status: 'active', started_at: new Date() }
      ] as unknown as step_execution[];

      const state = await getOrderState(mockOrder, mockWorkflow, mockExecutions);
      
      expect(state['printing']).toBe('ACTIVE');
    });

    it('should set DONE state for a per_part step only when every part is done', async () => {
      const mockExecutions = [
        { step_type: 'folding', status: 'done', order_part_id: 'part-1', started_at: new Date() },
        { step_type: 'folding', status: 'done', order_part_id: 'part-2', started_at: new Date() }
      ] as unknown as step_execution[];

      const state = await getOrderState(mockOrder, mockWorkflow, mockExecutions);
      
      expect(state['folding']).toBe('DONE');
    });

    it('should set WAITING state for a per_part step if at least one part is not ready', async () => {
      const mockExecutions = [
        { step_type: 'folding', status: 'done', order_part_id: 'part-1', started_at: new Date() }
      ] as unknown as step_execution[];

      const state = await getOrderState(mockOrder, mockWorkflow, mockExecutions);
      
      expect(state['folding']).toBe('WAITING');
    });

    it('should ignore cover when setting folding state', async () => {
      const mockExecutions = [
        { step_type: 'folding', status: 'done', order_part_id: 'part-1', started_at: new Date() },
        { step_type: 'folding', status: 'done', order_part_id: 'part-2', started_at: new Date() }
      ] as unknown as step_execution[];

      const state = await getOrderState(mockOrderWithCover, mockWorkflow, mockExecutions);

      expect(state['folding']).toBe('DONE');
    });
  });

  describe('canStartStepForPart', () => {
    it('should return false if the step has already started or finished', async () => {
      const mockExecutions = [
        { step_type: 'printing', status: 'active', started_at: new Date() }
      ] as unknown as step_execution[];

      const canStart = await canStartStepForPart({
        order: mockOrder,
        wf: mockWorkflow,
        step: 'printing' as step_name,
        orderPartId: null
      }, mockExecutions);

      expect(canStart).toBe(false);
    });

    it('should return true if the step has no dependencies and has not been executed', async () => {
      const mockExecutions: step_execution[] = [];

      const canStart = await canStartStepForPart({
        order: mockOrder,
        wf: mockWorkflow,
        step: 'printing' as step_name,
        orderPartId: null
      }, mockExecutions);

      expect(canStart).toBe(true);
    });

    it('should return false if the step depends on another step that is not ready', async () => {
      const mockExecutions: step_execution[] = [];

      const canStart = await canStartStepForPart({
        order: mockOrder,
        wf: mockWorkflow,
        step: 'sewing' as step_name,
        orderPartId: null
      }, mockExecutions);

      expect(canStart).toBe(false);
    });

    it('should return true if the step depends on another step and that step is done', async () => {
      const mockExecutions = [
        { step_type: 'folding', status: 'active', order_part_id: 'part-1', started_at: new Date() },
        { step_type: 'folding', status: 'active', order_part_id: 'part-2', started_at: new Date() }
      ] as unknown as step_execution[];

      const canStart = await canStartStepForPart({
        order: mockOrder,
        wf: mockWorkflow,
        step: 'sewing' as step_name,
        orderPartId: null
      }, mockExecutions);

      expect(canStart).toBe(true);
    });

    it('should ignore cover when an aggregated step waits for folding', async () => {
      const mockExecutions = [
        { step_type: 'folding', status: 'active', order_part_id: 'part-1', started_at: new Date() },
        { step_type: 'folding', status: 'active', order_part_id: 'part-2', started_at: new Date() }
      ] as unknown as step_execution[];

      const canStart = await canStartStepForPart({
        order: mockOrderWithCover,
        wf: mockWorkflow,
        step: 'sewing' as step_name,
        orderPartId: null
      }, mockExecutions);

      expect(canStart).toBe(true);
    });

    it('should not allow cover to start folding', async () => {
      const mockExecutions = [
        { step_type: 'printing', status: 'done', order_part_id: 'cover', started_at: new Date() }
      ] as unknown as step_execution[];

      const canStart = await canStartStepForPart({
        order: mockOrderWithCover,
        wf: mockWorkflow,
        step: 'folding' as step_name,
        orderPartId: 'cover'
      }, mockExecutions);

      expect(canStart).toBe(false);
    });
  });
});
