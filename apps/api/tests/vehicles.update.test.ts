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

function update(id: string, body: object, bearer = token) {
  return request(app).put(`/api/vehicles/${id}`).set("Authorization", `Bearer ${bearer}`).send(body);
}

describe("PUT /api/vehicles/:id", () => {
  it("requires a bearer token", async () => {
    const vehicle = await insertVehicle();

    const response = await request(app).put(`/api/vehicles/${vehicle.id}`).send({ priceCents: 1 });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("updates only the supplied fields", async () => {
    const vehicle = await insertVehicle({
      make: "Audi",
      model: "Q5",
      category: "suv",
      priceCents: 4_800_000,
      quantity: 3,
      year: 2022,
      description: "Original description",
    });

    const response = await update(vehicle.id, {
      priceCents: 4_600_000,
      description: "Price reduced for a quick sale.",
    });

    expect(response.status).toBe(200);
    expect(response.body.vehicle).toMatchObject({
      id: vehicle.id,
      make: "Audi",
      model: "Q5",
      category: "suv",
      priceCents: 4_600_000,
      quantity: 3,
      year: 2022,
      description: "Price reduced for a quick sale.",
    });
  });

  it("returns 404 for a vehicle that does not exist", async () => {
    const response = await update(randomUUID(), { priceCents: 1 });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 for a malformed id", async () => {
    const response = await update("not-a-uuid", { priceCents: 1 });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("rejects an empty update", async () => {
    const vehicle = await insertVehicle();

    const response = await update(vehicle.id, {});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an invalid field value", async () => {
    const vehicle = await insertVehicle();

    const response = await update(vehicle.id, { priceCents: -100 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
