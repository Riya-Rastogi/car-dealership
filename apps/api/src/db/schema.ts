import type { Role, VehicleCategory } from "@dealer/shared";
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    role: text("role").$type<Role>().notNull().default("customer"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export type UserRow = typeof users.$inferSelect;

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    make: text("make").notNull(),
    model: text("model").notNull(),
    category: text("category").$type<VehicleCategory>().notNull(),
    priceCents: integer("price_cents").notNull(),
    quantity: integer("quantity").notNull().default(0),
    year: smallint("year"),
    description: text("description"),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("vehicles_make_model_idx").on(table.make, table.model),
    index("vehicles_category_idx").on(table.category),
    index("vehicles_price_idx").on(table.priceCents),
    index("vehicles_quantity_idx").on(table.quantity),
    check("vehicles_price_non_negative", sql`${table.priceCents} >= 0`),
    check("vehicles_quantity_non_negative", sql`${table.quantity} >= 0`),
  ],
);

export type VehicleRow = typeof vehicles.$inferSelect;
