import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

const app = createApp();

const account = {
  email: "riya@example.com",
  password: "driver123",
  name: "Riya Rastogi",
};

let token = "";

beforeEach(async () => {
  const registration = await request(app).post("/api/auth/register").send(account).expect(201);
  token = registration.body.token as string;
});

describe("GET /api/auth/me", () => {
  it("returns the current user for a valid bearer token", async () => {
    const response = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      email: account.email,
      name: account.name,
      role: "customer",
    });
    expect(response.body.user).not.toHaveProperty("passwordHash");
  });

  it("returns 401 and a challenge when the token is missing", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
    expect(response.headers["www-authenticate"]).toContain("Bearer");
  });

  it("returns 401 for a malformed token", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer not-a-real-token");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });
});
