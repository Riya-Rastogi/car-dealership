import type { VehicleListQuery } from "@dealer/shared";
import { and, asc, count, desc, eq, gte, ilike, lte, or, type SQL } from "drizzle-orm";
import { db } from "../../db/client.js";
import { vehicles, type VehicleRow } from "../../db/schema.js";

/** Escapes LIKE metacharacters so a literal % or _ stays literal. */
function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}

function buildWhere(query: VehicleListQuery): SQL | undefined {
  const conditions: SQL[] = [];

  if (query.make) {
    conditions.push(ilike(vehicles.make, likePattern(query.make)));
  }

  if (query.model) {
    conditions.push(ilike(vehicles.model, likePattern(query.model)));
  }

  if (query.category) {
    conditions.push(eq(vehicles.category, query.category));
  }

  if (query.minPrice !== undefined) {
    conditions.push(gte(vehicles.priceCents, Math.round(query.minPrice * 100)));
  }

  if (query.maxPrice !== undefined) {
    conditions.push(lte(vehicles.priceCents, Math.round(query.maxPrice * 100)));
  }

  if (query.q) {
    const pattern = likePattern(query.q);
    const textMatch = or(ilike(vehicles.make, pattern), ilike(vehicles.model, pattern));

    if (textMatch) {
      conditions.push(textMatch);
    }
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export const vehicleRepository = {
  async findById(id: string): Promise<VehicleRow | null> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
    return vehicle ?? null;
  },

  async list(query: VehicleListQuery): Promise<{ rows: VehicleRow[]; total: number }> {
    const where = buildWhere(query);
    const offset = (query.page - 1) * query.limit;

    const order =
      query.sort === "price_asc"
        ? [asc(vehicles.priceCents), desc(vehicles.createdAt)]
        : query.sort === "price_desc"
          ? [desc(vehicles.priceCents), desc(vehicles.createdAt)]
          : [desc(vehicles.createdAt), desc(vehicles.id)];

    const rows = await db
      .select()
      .from(vehicles)
      .where(where)
      .orderBy(...order)
      .limit(query.limit)
      .offset(offset);

    const [totalRow] = await db.select({ total: count() }).from(vehicles).where(where);

    return {
      rows,
      total: Number(totalRow?.total ?? 0),
    };
  },
};
