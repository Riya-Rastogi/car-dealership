import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { registerUser } from "./helpers/auth.js";
import { insertVehicle } from "./helpers/vehicles.js";

const app = createApp();

let token = "";

beforeEach(async () => {
  token = (await registerUser(app)).token;
});

function get(path: string, bearer = token) {
  return request(app).get(path).set("Authorization", `Bearer ${bearer}`);
}

describe("GET /api/vehicles/:id", () => {
  it("requires a bearer token", async () => {
    const vehicle = await insertVehicle();

    const response = await request(app).get(`/api/vehicles/${vehicle.id}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns one vehicle with its public fields", async () => {
    const vehicle = await insertVehicle({
      make: "Mazda",
      model: "CX-5",
      category: "suv",
      priceCents: 2_900_000,
      quantity: 4,
      year: 2021,
      description: "One owner, full service history.",
    });

    const response = await get(`/api/vehicles/${vehicle.id}`);

    expect(response.status).toBe(200);
    expect(response.body.vehicle).toMatchObject({
      id: vehicle.id,
      make: "Mazda",
      model: "CX-5",
      category: "suv",
      priceCents: 2_900_000,
      quantity: 4,
      year: 2021,
      description: "One owner, full service history.",
      imageUrl: null,
    });
    expect(response.body.vehicle).not.toHaveProperty("price_cents");
  });

  it("returns 404 for a vehicle that does not exist", async () => {
    const response = await get(`/api/vehicles/${randomUUID()}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 rather than a database error for a malformed id", async () => {
    const response = await get("/api/vehicles/not-a-uuid");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
