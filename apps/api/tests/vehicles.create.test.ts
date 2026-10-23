import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { registerUser } from "./helpers/auth.js";

const app = createApp();

let token = "";

beforeEach(async () => {
  token = (await registerUser(app)).token;
});

function create(body: object, bearer = token) {
  return request(app).post("/api/vehicles").set("Authorization", `Bearer ${bearer}`).send(body);
}

const validVehicle = {
  make: "Volvo",
  model: "XC60",
  category: "suv",
  priceCents: 4_250_000,
  quantity: 2,
  year: 2023,
  description: "Mild hybrid, one owner.",
  imageUrl: "https://images.example.com/xc60.jpg",
};

describe("POST /api/vehicles", () => {
  it("requires a bearer token", async () => {
    const response = await request(app).post("/api/vehicles").send(validVehicle);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("creates a vehicle and returns it", async () => {
    const response = await create(validVehicle);

    expect(response.status).toBe(201);
    expect(response.body.vehicle).toMatchObject(validVehicle);
    expect(response.body.vehicle.id).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(response.body.vehicle.createdAt))).toBe(false);
  });

  it("defaults quantity to zero when it is omitted", async () => {
    const { quantity: _quantity, ...withoutQuantity } = validVehicle;

    const response = await create(withoutQuantity);

    expect(response.status).toBe(201);
    expect(response.body.vehicle.quantity).toBe(0);
  });

  it("rejects a body with missing required fields", async () => {
    const response = await create({ make: "Volvo", category: "suv", priceCents: 100 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: ["model"] })]),
    );
  });

  it("rejects a negative price", async () => {
    const response = await create({ ...validVehicle, priceCents: -1 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a negative quantity", async () => {
    const response = await create({ ...validVehicle, quantity: -3 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an unknown category", async () => {
    const response = await create({ ...validVehicle, category: "spaceship" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects fields the contract does not define", async () => {
    const response = await create({ ...validVehicle, mileage: 12_000 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
