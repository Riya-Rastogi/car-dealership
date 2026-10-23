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

function list(path: string, bearer = token) {
  return request(app).get(path).set("Authorization", `Bearer ${bearer}`);
}

async function seedCatalogue() {
  await insertVehicle({
    make: "Toyota",
    model: "Camry",
    category: "sedan",
    priceCents: 2_500_000,
    quantity: 2,
    year: 2020,
    createdAt: new Date("2024-01-01T00:00:00Z"),
  });
  await insertVehicle({
    make: "Honda",
    model: "CR-V",
    category: "suv",
    priceCents: 3_000_000,
    quantity: 0,
    year: 2021,
    createdAt: new Date("2024-02-01T00:00:00Z"),
  });
  await insertVehicle({
    make: "Ford",
    model: "F-150",
    category: "truck",
    priceCents: 4_500_000,
    quantity: 5,
    year: 2019,
    createdAt: new Date("2024-03-01T00:00:00Z"),
  });
  await insertVehicle({
    make: "Tesla",
    model: "Model 3",
    category: "ev",
    priceCents: 4_000_000,
    quantity: 1,
    year: 2023,
    createdAt: new Date("2024-04-01T00:00:00Z"),
  });
}

describe("GET /api/vehicles", () => {
  it("requires a bearer token", async () => {
    const response = await request(app).get("/api/vehicles");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns a paginated envelope with public vehicle fields", async () => {
    await seedCatalogue();

    const response = await list("/api/vehicles");

    expect(response.status).toBe(200);
    expect(response.body.meta).toEqual({
      page: 1,
      limit: 12,
      total: 4,
      totalPages: 1,
    });
    expect(response.body.data).toHaveLength(4);
    expect(response.body.data[0]).toMatchObject({
      make: expect.any(String),
      model: expect.any(String),
      category: expect.any(String),
      priceCents: expect.any(Number),
      quantity: expect.any(Number),
    });
    expect(response.body.data[0]).not.toHaveProperty("price_cents");
    expect(Number.isNaN(Date.parse(response.body.data[0].createdAt))).toBe(false);
  });

  it("paginates with page and limit", async () => {
    for (let index = 0; index < 15; index += 1) {
      await insertVehicle({ priceCents: 1_000_000 + index * 100_000 });
    }

    const response = await list("/api/vehicles?page=2&limit=5");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(5);
    expect(response.body.meta).toEqual({
      page: 2,
      limit: 5,
      total: 15,
      totalPages: 3,
    });
  });

  it("filters by a case-insensitive partial make", async () => {
    await seedCatalogue();

    const response = await list("/api/vehicles?make=toyo");

    expect(response.status).toBe(200);
    expect(response.body.meta.total).toBe(1);
    expect(response.body.data[0]).toMatchObject({ make: "Toyota", model: "Camry" });
  });

  it("filters by category", async () => {
    await seedCatalogue();

    const response = await list("/api/vehicles?category=suv");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].model).toBe("CR-V");
  });

  it("includes both price boundaries", async () => {
    await seedCatalogue();

    const response = await list("/api/vehicles?minPrice=30000&maxPrice=40000");

    expect(response.status).toBe(200);
    expect(response.body.data.map((vehicle: { priceCents: number }) => vehicle.priceCents)).toEqual(
      expect.arrayContaining([3_000_000, 4_000_000]),
    );
    expect(response.body.meta.total).toBe(2);
  });

  it("searches free text across make and model", async () => {
    await seedCatalogue();

    const response = await list("/api/vehicles?q=model");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].make).toBe("Tesla");
  });

  it("sorts by price ascending and descending", async () => {
    await seedCatalogue();

    const ascending = await list("/api/vehicles?sort=price_asc");
    const descending = await list("/api/vehicles?sort=price_desc");

    const prices = ascending.body.data.map((vehicle: { priceCents: number }) => vehicle.priceCents);
    expect(prices).toEqual([2_500_000, 3_000_000, 4_000_000, 4_500_000]);
    expect(descending.body.data.map((vehicle: { priceCents: number }) => vehicle.priceCents)).toEqual(
      [4_500_000, 4_000_000, 3_000_000, 2_500_000],
    );
  });

  it("sorts newest first by default", async () => {
    await seedCatalogue();

    const response = await list("/api/vehicles");

    expect(response.body.data.map((vehicle: { make: string }) => vehicle.make)).toEqual([
      "Tesla",
      "Ford",
      "Honda",
      "Toyota",
    ]);
  });

  it("rejects a limit above 100", async () => {
    const response = await list("/api/vehicles?limit=101");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a price range whose minimum exceeds its maximum", async () => {
    const response = await list("/api/vehicles?minPrice=50000&maxPrice=10000");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
