import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

const app = createApp();

const account = {
  email: "riya@example.com",
  password: "driver123",
  name: "Riya Rastogi",
};

async function registerAccount() {
  await request(app).post("/api/auth/register").send(account).expect(201);
}

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await registerAccount();
  });

  it("returns the user and a signed token for valid credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: account.email, password: account.password });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      email: account.email,
      name: account.name,
      role: "customer",
    });
    expect(response.body.user).not.toHaveProperty("passwordHash");

    const payload = jwt.verify(response.body.token, process.env.JWT_SECRET ?? "") as jwt.JwtPayload;

    expect(payload.sub).toBe(response.body.user.id);
    expect(payload.role).toBe("customer");
  });

  it("rejects a wrong password", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: account.email, password: "wrongpass1" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects an unknown email with the same message as a wrong password", async () => {
    const wrongPassword = await request(app)
      .post("/api/auth/login")
      .send({ email: account.email, password: "wrongpass1" });
    const unknownEmail = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: account.password });

    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body.error.code).toBe("UNAUTHORIZED");
    expect(unknownEmail.body.error.message).toBe(wrongPassword.body.error.message);
  });
});
