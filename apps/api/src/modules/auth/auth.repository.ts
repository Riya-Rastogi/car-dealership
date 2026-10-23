import type { Role } from "@dealer/shared";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { users, type UserRow } from "../../db/schema.js";

export const userRepository = {
  async create(input: {
    email: string;
    passwordHash: string;
    name: string;
    role?: Role;
  }): Promise<UserRow> {
    const [user] = await db.insert(users).values(input).returning();

    if (!user) {
      throw new Error("Insert into users returned no row");
    }

    return user;
  },

  async findByEmail(email: string): Promise<UserRow | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user ?? null;
  },

  async findById(id: string): Promise<UserRow | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  },
};
