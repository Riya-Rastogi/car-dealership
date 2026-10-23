import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { registerUser } from "./helpers/auth.js";
import { insertVehicle } from "./helpers/vehicles.js";

const app = createApp();

let token = "";
let userId = "";

beforeEach(async () => {
  const registered = await registerUser(app);
  token = registered.token;
  userId = registered.user.id;
});

function history(bearer = token) {
  return request(app).get("/api/purchases").set("Authorization", `Bearer ${bearer}`);
}

describe("GET /api/purchases", () => {
  it("requires a bearer token", async () => {
    const response = await request(app).get("/api/purchases");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns only the caller's purchases, newest first, with vehicle details", async () => {
    const older = await insertVehicle({ make: "Toyota", model: "Camry" });
    const newer = await insertVehicle({ make: "Tesla", model: "Model 3" });

    await request(app)
      .post(`/api/vehicles/${older.id}/purchase`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    await request(app)
      .post(`/api/vehicles/${newer.id}/purchase`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    // Another buyer's purchase must not leak into this history.
    const other = await registerUser(app);
    await request(app)
      .post(`/api/vehicles/${older.id}/purchase`)
      .set("Authorization", `Bearer ${other.token}`)
      .expect(200);

    const response = await history();

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data.map((purchase: { vehicle: { model: string } }) => purchase.vehicle.model)).toEqual([
      "Model 3",
      "Camry",
    ]);
    expect(response.body.data[0]).toMatchObject({
      quantity: 1,
      totalCents: expect.any(Number),
      vehicle: { make: "Tesla", model: "Model 3" },
    });
  });

  it("returns an empty list for a buyer with no purchases", async () => {
    const response = await history();

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(userId).toEqual(expect.any(String));
  });
});
