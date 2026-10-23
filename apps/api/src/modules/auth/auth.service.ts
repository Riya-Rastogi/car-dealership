import { hash } from "@node-rs/argon2";
import type { AuthResponse, PublicUser, RegisterInput } from "@dealer/shared";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import type { UserRow } from "../../db/schema.js";
import { userRepository } from "./auth.repository.js";

// OWASP's baseline Argon2id configuration (19 MiB, 2 iterations, 1 lane).
const ARGON2_OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

function issueToken(user: UserRow): string {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: "60m",
  });
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthResponse> {
    const passwordHash = await hash(input.password, ARGON2_OPTIONS);

    const user = await userRepository.create({
      email: input.email,
      passwordHash,
      name: input.name,
    });

    return {
      user: toPublicUser(user),
      token: issueToken(user),
    };
  },
};
