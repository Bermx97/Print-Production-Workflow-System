import { jest, expect, describe, it } from "@jest/globals";
import { step_name } from '@prisma/client';
import { getOrderState } from '../../../src/modules/orders/workflow/state/orderState.service';
import { canStartStepForPart } from '../../../src/modules/orders/workflow/rules/dependency.rules';

jest.mock('../../../src/modules/orders/domain/workflowContext', () => {
  const originalModule = jest.requireActual('../../../src/modules/orders/domain/workflowContext') as any;
  return {
    __esModule: true,
    ...originalModule,
    getScope: (step: step_name) => (step === 'folding' ? 'per_part' : 'global'),
  };
});

describe('Workflow V2 Optimization - Unit Tests', () => {
  const mockWorkflow = {
    printing: [],
    folding: ['printing'],
    sewing: ['folding']
  } as any;

  const mockOrder = {
    id: 123,
    product_type: 'TEST_PRODUCT',
    order_parts: [
      { id: 'part-1' },
      { id: 'part-2' }
    ]
  };

  describe('getOrderState', () => {
    it('should set ACTIVE state when at least one execution is active', async () => {
      const mockExecutions = [
        { step_type: 'printing', status: 'active', started_at: new Date() }
      ];

      const state = await getOrderState(mockOrder, mockWorkflow, mockExecutions);
      
      expect(state['printing']).toBe('ACTIVE');
    });

    it('should set DONE state for a per_part step only when every part is done', async () => {
      const mockExecutions = [
        { step_type: 'folding', status: 'done', order_part_id: 'part-1', started_at: new Date() },
        { step_type: 'folding', status: 'done', order_part_id: 'part-2', started_at: new Date() }
      ];

      const state = await getOrderState(mockOrder, mockWorkflow, mockExecutions);
      
      expect(state['folding']).toBe('DONE');
    });

    it('should set WAITING state for a per_part step if at least one part is not ready', async () => {
      const mockExecutions = [
        { step_type: 'folding', status: 'done', order_part_id: 'part-1', started_at: new Date() }
      ];

      const state = await getOrderState(mockOrder, mockWorkflow, mockExecutions);
      
      expect(state['folding']).toBe('WAITING');
    });
  });

  describe('canStartStepForPart', () => {
    it('should return false if the step has already started or finished', async () => {
      const mockExecutions = [
        { step_type: 'printing', status: 'active', started_at: new Date() }
      ];

      const canStart = await canStartStepForPart({
        order: mockOrder,
        wf: mockWorkflow,
        step: 'printing' as step_name,
        orderPartId: null
      }, mockExecutions);

      expect(canStart).toBe(false);
    });

    it('should return true if the step has no dependencies and has not been executed', async () => {
      const mockExecutions: any[] = [];

      const canStart = await canStartStepForPart({
        order: mockOrder,
        wf: mockWorkflow,
        step: 'printing' as step_name,
        orderPartId: null
      }, mockExecutions);

      expect(canStart).toBe(true);
    });

    it('should return false if the step depends on another step that is not ready', async () => {
      const mockExecutions: any[] = [];

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
      ];

      const canStart = await canStartStepForPart({
        order: mockOrder,
        wf: mockWorkflow,
        step: 'sewing' as step_name,
        orderPartId: null
      }, mockExecutions);

      expect(canStart).toBe(true);
    });
  });
});