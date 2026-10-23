import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { registerAdmin, registerUser } from "./helpers/auth.js";
import { insertVehicle } from "./helpers/vehicles.js";
import { pool } from "../src/db/client.js";

const app = createApp();

let customerToken = "";
let adminToken = "";

beforeEach(async () => {
  customerToken = (await registerUser(app)).token;
  adminToken = (await registerAdmin(app)).token;
});

function remove(id: string, bearer: string) {
  return request(app).delete(`/api/vehicles/${id}`).set("Authorization", `Bearer ${bearer}`);
}

describe("DELETE /api/vehicles/:id", () => {
  it("requires a bearer token", async () => {
    const vehicle = await insertVehicle();

    const response = await request(app).delete(`/api/vehicles/${vehicle.id}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("forbids a customer from deleting inventory", async () => {
    const vehicle = await insertVehicle();

    const response = await remove(vehicle.id, customerToken);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");

    const { rows } = await pool.query("select 1 from vehicles where id = $1", [vehicle.id]);
    expect(rows).toHaveLength(1);
  });

  it("lets an admin delete a vehicle and returns 204", async () => {
    const vehicle = await insertVehicle();

    const response = await remove(vehicle.id, adminToken);

    expect(response.status).toBe(204);
    expect(response.text).toBe("");

    const { rows } = await pool.query("select 1 from vehicles where id = $1", [vehicle.id]);
    expect(rows).toHaveLength(0);
  });

  it("returns 404 when an admin deletes a vehicle that does not exist", async () => {
    const response = await remove(randomUUID(), adminToken);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 for a malformed id before touching the database", async () => {
    const response = await remove("not-a-uuid", adminToken);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
