import request from "supertest";
import { app } from "../../src/app";

it("login works", async () => {
        console.log(process.env.DATABASE_URL);
  const res = await request(app)
    .post("/auth/login")
    .send({
      login: "admin",
      password: "admin123"
    });

  expect(res.status).toBe(200);
  expect(res.body.token).toBeDefined();
});