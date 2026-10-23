import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { db } from "../src/db/client.js";
import { users } from "../src/db/schema.js";

const app = createApp();

const validRegistration = {
  email: "Riya@Example.com",
  password: "driver123",
  name: "Riya Rastogi",
};

describe("POST /api/auth/register", () => {
  it("creates a customer, hashes the password and returns a signed token", async () => {
    const response = await request(app).post("/api/auth/register").send(validRegistration);

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      email: "riya@example.com",
      name: "Riya Rastogi",
      role: "customer",
    });
    expect(response.body.user).not.toHaveProperty("passwordHash");
    expect(response.body.user).not.toHaveProperty("password_hash");
    expect(Number.isNaN(Date.parse(response.body.user.createdAt))).toBe(false);
    expect(typeof response.body.token).toBe("string");

    const payload = jwt.verify(response.body.token, process.env.JWT_SECRET ?? "") as jwt.JwtPayload;

    expect(payload.sub).toBe(response.body.user.id);
    expect(payload.role).toBe("customer");
    expect(payload.exp).toBeGreaterThan(payload.iat ?? 0);

    const [stored] = await db.select().from(users);

    expect(stored?.passwordHash).not.toBe(validRegistration.password);
    expect(stored?.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it("rejects an email that is already registered", async () => {
    await request(app).post("/api/auth/register").send(validRegistration).expect(201);

    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...validRegistration, email: "RIYA@example.com", name: "Someone Else" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("EMAIL_TAKEN");

    const stored = await db.select().from(users);
    expect(stored).toHaveLength(1);
    expect(stored[0]?.name).toBe(validRegistration.name);
  });

  it("rejects a password shorter than eight characters", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...validRegistration, password: "abc1" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: ["password"] })]),
    );
  });

  it("rejects a password without a number", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...validRegistration, password: "onlyletters" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: ["password"] })]),
    );
  });

  it("rejects an invalid email address", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...validRegistration, email: "not-an-email" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: ["email"] })]),
    );
  });
});
