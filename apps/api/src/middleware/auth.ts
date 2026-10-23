import type { Role } from "@dealer/shared";
import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

interface AccessTokenClaims extends jwt.JwtPayload {
  role?: Role;
}

/**
 * Verifies the Bearer token and attaches { id, role } to the request.
 * The role is trusted from the token; a role change takes effect on the next
 * login. Revocation would need a token version checked against the database.
 */
export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.header("authorization");

  if (!header?.startsWith("Bearer ")) {
    res.setHeader("WWW-Authenticate", 'Bearer realm="api"');
    res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    });
    return;
  }

  try {
    const token = header.slice("Bearer ".length).trim();
    const payload = jwt.verify(token, env.JWT_SECRET) as AccessTokenClaims;

    if (
      typeof payload.sub !== "string" ||
      (payload.role !== "customer" && payload.role !== "admin")
    ) {
      throw new Error("Token is missing required claims");
    }

    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    res.setHeader("WWW-Authenticate", 'Bearer realm="api", error="invalid_token"');
    res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      },
    });
  }
};

/**
 * Must run after requireAuth. The API enforces the role even when the UI has
 * already hidden the control: hiding a button is not authorization.
 */
export const requireAdmin: RequestHandler = (req, res, next) => {
  if (req.user?.role !== "admin") {
    res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Admin access required",
      },
    });
    return;
  }

  next();
};
