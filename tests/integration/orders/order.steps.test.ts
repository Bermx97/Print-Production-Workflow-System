import request from "supertest";
import { createOrder } from "../../utils/order"; 
import { getAuthToken } from "../../utils/auth"; 
import prisma from "../../../src/lib/prisma";
import { buildState } from "../../../src/modules/orders/state/state"; 
import { workflow } from "../../../src/modules/orders/orders.workflow";
import app from "../../../src/app";
import { describe } from "node:test";



describe('step authorization', () => {
    
    it('should block a step', async () => {
        const { token } = await getAuthToken('stitching_operator');
        const order = await createOrder('saddle_stitching');
        await request(app)
        .post(`/orders/${order.order_number}/start`)
        .set("Authorization", `Bearer ${token}`)
        .expect(409);
        const wf = workflow[order.product_type];
        const logs = await prisma.step_logs.findMany({ where: { order_id: order.id }});
        const state = buildState(logs, wf);
        expect(state.printing).not.toBe('DONE');
        expect(state.folding).not.toBe('DONE');
    });
});

describe('step lifecycle (start/end)', () => {

    it('should complete step and progress workflow', async () => {
        const { token, user: { id } } = await getAuthToken('printer_operator');
        const order = await createOrder('saddle_stitching');
        await request(app)
        .post(`/orders/${order.order_number}/start`)
        .set("Authorization", `Bearer ${token}`);

        const response = await request(app)
        .post(`/orders/${order.order_number}/end`)
        .set("Authorization", `Bearer ${token}`)
        .send({ stepQuantity: 200 })
        .expect(200);

        const logs = await prisma.step_logs.findMany({
            where: { order_id: order.id }
        });

        expect(logs.length).toBe(2);

        const start = logs.find(l => l.event_type === "START");
        const end = logs.find(l => l.event_type === "END");

        expect(start).toBeDefined();
        expect(end).toBeDefined();
    });

    it('should block a second start', async () => {
        const { token } = await getAuthToken('printer_operator');
        const order = await createOrder('saddle_stitching');

        await request(app)
        .post(`/orders/${order.order_number}/start`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

        await request(app)
        .post(`/orders/${order.order_number}/start`)
        .set("Authorization", `Bearer ${token}`)
        .expect(409);
    });

    it('should block a second end', async () => {
        const { token } = await getAuthToken('printer_operator');
        const order = await createOrder('saddle_stitching');

        await request(app)
        .post(`/orders/${order.order_number}/start`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

        await request(app)
        .post(`/orders/${order.order_number}/end`)
        .set("Authorization", `Bearer ${token}`)
        .send({ stepQuantity: 200 })
        .expect(200);

        await request(app)
        .post(`/orders/${order.order_number}/end`)
        .set("Authorization", `Bearer ${token}`)
        .send({ stepQuantity: 200 })
        .expect(409);
    });
})

describe('workflow transitions', () => {

    it('should start a step and let the next one start', async () => {
        const printer = await getAuthToken('printer_operator');
        const order = await createOrder('hardcover_book');
        let logs;
        let state;
        const wf = workflow[order.product_type];
        
        
        await request(app)
        .post(`/orders/${order.order_number}/start`)
        .set("Authorization", `Bearer ${printer.token}`)
        .expect(200);

        logs = await prisma.step_logs.findMany({ where: { order_id: order.id }});
        state = buildState(logs, wf);

        expect(state.printing).toBe('ACTIVE');

        const folding =  await getAuthToken('folding_operator');
        await request(app)
        .post(`/orders/${order.order_number}/start`)
        .set("Authorization", `Bearer ${folding.token}`)
        .expect(200);

        logs = await prisma.step_logs.findMany({ where: { order_id: order.id }});
        state = buildState(logs, wf);

        expect(state.folding).toBe('ACTIVE');

        await request(app)
        .post(`/orders/${order.order_number}/end`)
        .set("Authorization", `Bearer ${printer.token}`)
        .send({ stepQuantity: 200 })
        .expect(200);

        logs = await prisma.step_logs.findMany({ where: { order_id: order.id }});
        state = buildState(logs, wf);

        expect(state.printing).toBe('DONE');

        const caseMaker =  await getAuthToken('case_maker');
        const sewing =  await getAuthToken('sewing_operator');

        await request(app)
        .post(`/orders/${order.order_number}/start`)
        .set("Authorization", `Bearer ${caseMaker.token}`)
        .expect(200);

        logs = await prisma.step_logs.findMany({ where: { order_id: order.id }});
        state = buildState(logs, wf);
        expect(state.case_making).toBe('ACTIVE');

        await request(app)
        .post(`/orders/${order.order_number}/start`)
        .set("Authorization", `Bearer ${sewing.token}`)
        .expect(200);

        logs = await prisma.step_logs.findMany({ where: { order_id: order.id }});
        state = buildState(logs, wf);
        expect(state.hardcover_binding).toBe('NOT_STARTED');
        expect(logs.length).toBe(5);
        expect(state.sewing).toBe('ACTIVE');
    });
});
