import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { registerAdmin, registerUser } from "./helpers/auth.js";
import { insertVehicle } from "./helpers/vehicles.js";

const app = createApp();

let customerToken = "";
let adminToken = "";

beforeEach(async () => {
  customerToken = (await registerUser(app)).token;
  adminToken = (await registerAdmin(app)).token;
});

function restock(id: string, body: object, bearer = adminToken) {
  return request(app)
    .post(`/api/vehicles/${id}/restock`)
    .set("Authorization", `Bearer ${bearer}`)
    .send(body);
}

describe("POST /api/vehicles/:id/restock", () => {
  it("requires a bearer token", async () => {
    const vehicle = await insertVehicle();

    const response = await request(app).post(`/api/vehicles/${vehicle.id}/restock`).send({ quantity: 2 });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("forbids a customer from restocking inventory", async () => {
    const vehicle = await insertVehicle({ quantity: 1 });

    const response = await restock(vehicle.id, { quantity: 5 }, customerToken);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("increases stock by the requested amount", async () => {
    const vehicle = await insertVehicle({ quantity: 2 });

    const response = await restock(vehicle.id, { quantity: 5 });

    expect(response.status).toBe(200);
    expect(response.body.vehicle.id).toBe(vehicle.id);
    expect(response.body.vehicle.quantity).toBe(7);
  });

  it("rejects a zero quantity", async () => {
    const vehicle = await insertVehicle();

    const response = await restock(vehicle.id, { quantity: 0 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a negative quantity", async () => {
    const vehicle = await insertVehicle();

    const response = await restock(vehicle.id, { quantity: -4 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a fractional quantity", async () => {
    const vehicle = await insertVehicle();

    const response = await restock(vehicle.id, { quantity: 1.5 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 for an unknown vehicle", async () => {
    const response = await restock(randomUUID(), { quantity: 1 });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 for a malformed id", async () => {
    const response = await restock("not-a-uuid", { quantity: 1 });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
