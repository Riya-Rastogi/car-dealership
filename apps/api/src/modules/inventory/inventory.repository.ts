import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  purchases,
  vehicles,
  type PurchaseRow,
  type VehicleRow,
} from "../../db/schema.js";

export type PurchaseAttempt =
  | { kind: "ok"; vehicle: VehicleRow; purchase: PurchaseRow }
  | { kind: "missing" }
  | { kind: "out_of_stock" };

export const inventoryRepository = {
  /**
   * One conditional UPDATE decides whether the last unit is still available.
   * Under READ COMMITTED a concurrent transaction waits for the row lock and
   * then re-evaluates `quantity > 0`, so two buyers can never both win.
   */
  async purchase(userId: string, vehicleId: string): Promise<PurchaseAttempt> {
    return db.transaction(async (tx) => {
      const [vehicle] = await tx
        .update(vehicles)
        .set({
          quantity: sql`${vehicles.quantity} - 1`,
          updatedAt: new Date(),
        })
        .where(and(eq(vehicles.id, vehicleId), gt(vehicles.quantity, 0)))
        .returning();

      if (!vehicle) {
        const [existing] = await tx
          .select({ id: vehicles.id })
          .from(vehicles)
          .where(eq(vehicles.id, vehicleId))
          .limit(1);

        return existing ? { kind: "out_of_stock" } : { kind: "missing" };
      }

      const [purchase] = await tx
        .insert(purchases)
        .values({
          vehicleId,
          userId,
          quantity: 1,
          unitPriceCents: vehicle.priceCents,
          totalCents: vehicle.priceCents,
        })
        .returning();

      if (!purchase) {
        throw new Error("Insert into purchases returned no row");
      }

      return { kind: "ok", vehicle, purchase };
    });
  },

  async restock(id: string, quantity: number): Promise<VehicleRow | null> {
    const [vehicle] = await db
      .update(vehicles)
      .set({
        quantity: sql`${vehicles.quantity} + ${quantity}`,
        updatedAt: new Date(),
      })
      .where(eq(vehicles.id, id))
      .returning();

    return vehicle ?? null;
  },

  async listPurchases(userId: string) {
    return db
      .select({ purchase: purchases, vehicle: vehicles })
      .from(purchases)
      .innerJoin(vehicles, eq(purchases.vehicleId, vehicles.id))
      .where(eq(purchases.userId, userId))
      .orderBy(desc(purchases.createdAt));
  },
};
