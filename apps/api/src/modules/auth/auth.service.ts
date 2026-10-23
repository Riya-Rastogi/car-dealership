import { hash } from "@node-rs/argon2";
import type { AuthResponse, PublicUser, RegisterInput } from "@dealer/shared";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import type { UserRow } from "../../db/schema.js";
import { AppError } from "../../lib/errors.js";
import { isUniqueViolation } from "../../lib/pg-errors.js";
import { userRepository } from "./auth.repository.js";

// OWASP's baseline Argon2id configuration (19 MiB, 2 iterations, 1 lane).
const ARGON2_OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

const EMAIL_TAKEN_MESSAGE = "An account with this email already exists";

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
    // Check first so the common case does not pay for a hash. The unique index
    // still decides the winner when two requests race past this read.
    const existing = await userRepository.findByEmail(input.email);

    if (existing) {
      throw new AppError(409, "EMAIL_TAKEN", EMAIL_TAKEN_MESSAGE);
    }

    const passwordHash = await hash(input.password, ARGON2_OPTIONS);

    try {
      const user = await userRepository.create({
        email: input.email,
        passwordHash,
        name: input.name,
      });

      return {
        user: toPublicUser(user),
        token: issueToken(user),
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError(409, "EMAIL_TAKEN", EMAIL_TAKEN_MESSAGE);
      }

      throw error;
    }
  },
};
