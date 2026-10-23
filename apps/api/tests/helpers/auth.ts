import type { Express } from "express";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { eq } from "drizzle-orm";
import { db } from "../../src/db/client.js";
import { users } from "../../src/db/schema.js";

interface AccountOverrides {
  email?: string;
  password?: string;
  name?: string;
}

const defaultAccount = {
  email: "driver@example.com",
  password: "driver123",
  name: "Test Driver",
};

export async function registerUser(app: Express, overrides: AccountOverrides = {}) {
  const account = {
    ...defaultAccount,
    email: `driver-${randomUUID()}@example.com`,
    ...overrides,
  };

  const response = await request(app).post("/api/auth/register").send(account).expect(201);

  return {
    account,
    token: response.body.token as string,
    user: response.body.user as { id: string; email: string; role: string },
  };
}

export async function registerAdmin(app: Express) {
  const registered = await registerUser(app);

  await db.update(users).set({ role: "admin" }).where(eq(users.id, registered.user.id));

  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: registered.account.email, password: registered.account.password })
    .expect(200);

  return {
    ...registered,
    token: login.body.token as string,
  };
}
