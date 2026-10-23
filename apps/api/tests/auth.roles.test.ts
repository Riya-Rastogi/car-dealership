import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import type { Role } from "@dealer/shared";
import { requireAdmin, requireAuth } from "../src/middleware/auth.js";

function buildProbeApp() {
  const app = express();

  app.get("/probe", requireAuth, requireAdmin, (_req, res) => {
    res.status(200).json({ ok: true });
  });

  return app;
}

function tokenFor(role: Role) {
  return jwt.sign({ role }, process.env.JWT_SECRET ?? "", {
    subject: "00000000-0000-0000-0000-000000000001",
    expiresIn: "60m",
  });
}

describe("admin role guard", () => {
  it("allows a request carrying an admin token", async () => {
    const response = await request(buildProbeApp())
      .get("/probe")
      .set("Authorization", `Bearer ${tokenFor("admin")}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it("forbids a customer from an admin route", async () => {
    const response = await request(buildProbeApp())
      .get("/probe")
      .set("Authorization", `Bearer ${tokenFor("customer")}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });
});
