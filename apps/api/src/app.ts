import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { inventoryRouter } from "./modules/inventory/inventory.routes.js";
import { vehicleRouter } from "./modules/vehicles/vehicles.routes.js";
import { healthRouter } from "./routes/health.js";

/**
 * Builds the HTTP app without starting a listener so tests can drive it
 * through Supertest. Route wiring lands here as each feature is built.
 */
export function createApp() {
  const app = express();

  // CORS_ORIGIN accepts a comma-separated list so a preview deployment and the
  // production SPA can both call the same API.
  const allowedOrigins = env.CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(cors({ origin: allowedOrigins }));
  app.use(express.json());

  app.use("/api", healthRouter);
  app.use("/api", authRouter);
  app.use("/api", vehicleRouter);
  app.use("/api", inventoryRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
