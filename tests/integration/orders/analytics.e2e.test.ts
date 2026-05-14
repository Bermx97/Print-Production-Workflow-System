import request from "supertest";
import app from "../../../src/app";
import { createOrderWithLogs } from "../../utils/order";
import { getAuthToken } from "../../utils/auth";

describe("GET /orders/:orderNumber/analytics", () => {

  it("returns step speeds ", async () => {
    const { token } = await getAuthToken()
    const { order } = await createOrderWithLogs('hardcover_book', 2500);
    const res = await request(app)

    .get(`/orders/${order.order_number}/analytics`)
    .set("Authorization", `Bearer ${token}`)

    expect(res.status).toBe(200);

    expect(res.body).toHaveProperty("speeds");
    expect(Array.isArray(res.body.speeds)).toBe(true);

    expect(res.body.speeds[0]).toHaveProperty("step");
    expect(res.body.speeds[0]).toHaveProperty("speed");
  });
});