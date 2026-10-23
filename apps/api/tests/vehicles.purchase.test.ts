import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { pool } from "../src/db/client.js";
import { registerUser } from "./helpers/auth.js";
import { insertVehicle } from "./helpers/vehicles.js";

const app = createApp();

let token = "";

beforeEach(async () => {
  token = (await registerUser(app)).token;
});

function purchase(id: string, bearer = token) {
  return request(app)
    .post(`/api/vehicles/${id}/purchase`)
    .set("Authorization", `Bearer ${bearer}`)
    .send({});
}

async function quantityOf(id: string): Promise<number> {
  const { rows } = await pool.query<{ quantity: number }>(
    "select quantity from vehicles where id = $1",
    [id],
  );
  return rows[0]?.quantity ?? -1;
}

describe("POST /api/vehicles/:id/purchase", () => {
  it("requires a bearer token", async () => {
    const vehicle = await insertVehicle();

    const response = await request(app).post(`/api/vehicles/${vehicle.id}/purchase`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("decrements stock and records the sale at the listed price", async () => {
    const vehicle = await insertVehicle({ priceCents: 3_250_000, quantity: 2 });

    const response = await purchase(vehicle.id);

    expect(response.status).toBe(200);
    expect(response.body.vehicle.id).toBe(vehicle.id);
    expect(response.body.vehicle.quantity).toBe(1);
    expect(response.body.purchase).toMatchObject({
      vehicleId: vehicle.id,
      quantity: 1,
      unitPriceCents: 3_250_000,
      totalCents: 3_250_000,
    });
    expect(await quantityOf(vehicle.id)).toBe(1);
  });

  it("returns 409 and leaves quantity at zero when the vehicle is out of stock", async () => {
    const vehicle = await insertVehicle({ quantity: 0 });

    const response = await purchase(vehicle.id);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("VEHICLE_OUT_OF_STOCK");
    expect(await quantityOf(vehicle.id)).toBe(0);
  });

  it("returns 404 for an unknown vehicle", async () => {
    const response = await purchase(randomUUID());

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 for a malformed id", async () => {
    const response = await purchase("not-a-uuid");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("allows exactly one of two concurrent purchases for the last unit", async () => {
    const vehicle = await insertVehicle({ quantity: 1 });

    const responses = await Promise.all([purchase(vehicle.id), purchase(vehicle.id)]);
    const statuses = responses.map((response) => response.status).sort();

    expect(statuses).toEqual([200, 409]);
    expect(await quantityOf(vehicle.id)).toBe(0);

    const { rows } = await pool.query<{ total: string }>(
      "select count(*)::text as total from purchases where vehicle_id = $1",
      [vehicle.id],
    );
    expect(rows[0]?.total).toBe("1");
  });
});
