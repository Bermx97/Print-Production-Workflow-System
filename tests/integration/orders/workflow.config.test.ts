import { workflow } from "../../../src/modules/orders/orders.workflow";
import { roleStatusMap } from "../../../src/modules/orders/orders.workflow";

describe('workflow config integrity', () => {

  it('every workflow step should be assigned to at least one role', () => {
    const workflowSteps = new Set();

    Object.values(workflow).forEach(productWorkflow => {
      Object.keys(productWorkflow).forEach(step => {
        workflowSteps.add(step);
      });
    });

    const roleSteps = new Set();

    Object.values(roleStatusMap).forEach(role => {

      if (role.type === 'LIMITED') {
        role.steps.forEach(step => {
          roleSteps.add(step);
        });
      }
    });

    workflowSteps.forEach(step => {
      expect(roleSteps.has(step)).toBe(true);
    });
  });
});

    it('every role step should exist in workflow definitions', () => {

    const workflowSteps = new Set();

    Object.values(workflow).forEach(productWorkflow => {
        Object.keys(productWorkflow).forEach(step => {
        workflowSteps.add(step);
        });
    });

    Object.values(roleStatusMap).forEach(role => {

        if (role.type === 'LIMITED') {

        role.steps.forEach(step => {
            expect(workflowSteps.has(step)).toBe(true);
        });
        }
    });
    });

    it('all workflow dependencies should exist', () => {

    const workflowSteps = new Set();

    Object.values(workflow).forEach(productWorkflow => {
        Object.keys(productWorkflow).forEach(step => {
        workflowSteps.add(step);
        });
    });

    Object.values(workflow).forEach(productWorkflow => {

        Object.entries(productWorkflow).forEach(([step, dependencies]) => {

        dependencies.forEach(dep => {
            expect(workflowSteps.has(dep)).toBe(true);
        });
        });
    });
    });