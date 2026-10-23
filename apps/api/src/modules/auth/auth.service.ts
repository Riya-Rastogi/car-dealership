import type { AuthResponse, LoginInput, PublicUser, RegisterInput } from "@dealer/shared";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import type { UserRow } from "../../db/schema.js";
import { AppError } from "../../lib/errors.js";
import { hashPassword, verifyPassword } from "../../lib/passwords.js";
import { isUniqueViolation } from "../../lib/pg-errors.js";
import { userRepository } from "./auth.repository.js";

const EMAIL_TAKEN_MESSAGE = "An account with this email already exists";
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";

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

    const passwordHash = await hashPassword(input.password);

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

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await userRepository.findByEmail(input.email);

    if (!user) {
      throw new AppError(401, "UNAUTHORIZED", INVALID_CREDENTIALS_MESSAGE);
    }

    const passwordMatches = await verifyPassword(user.passwordHash, input.password);

    if (!passwordMatches) {
      throw new AppError(401, "UNAUTHORIZED", INVALID_CREDENTIALS_MESSAGE);
    }

    return {
      user: toPublicUser(user),
      token: issueToken(user),
    };
  },

  async me(userId: string): Promise<PublicUser> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError(401, "UNAUTHORIZED", "The account for this token no longer exists");
    }

    return toPublicUser(user);
  },
};
