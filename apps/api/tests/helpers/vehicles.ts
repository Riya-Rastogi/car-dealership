import { randomUUID } from "node:crypto";
import { db } from "../../src/db/client.js";
import { vehicles } from "../../src/db/schema.js";

type NewVehicle = typeof vehicles.$inferInsert;

export async function insertVehicle(overrides: Partial<NewVehicle> = {}) {
  const suffix = randomUUID().slice(0, 8);

  const [vehicle] = await db
    .insert(vehicles)
    .values({
      make: `Make-${suffix}`,
      model: `Model-${suffix}`,
      category: "sedan",
      priceCents: 2_500_000,
      quantity: 3,
      ...overrides,
    })
    .returning();

  if (!vehicle) {
    throw new Error("Insert into vehicles returned no row");
  }

  return vehicle;
}
