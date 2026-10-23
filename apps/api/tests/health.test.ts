import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

describe("GET /api/health", () => {
  it("responds 200 with a healthy status payload", async () => {
    const response = await request(createApp()).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/application\/json/);
    expect(response.body).toMatchObject({ status: "ok" });
    expect(typeof response.body.uptime).toBe("number");
    expect(typeof response.body.timestamp).toBe("string");
    expect(Number.isNaN(Date.parse(response.body.timestamp))).toBe(false);
  });
});
