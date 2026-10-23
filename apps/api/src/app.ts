import express from "express";

/**
 * Builds the HTTP app without starting a listener so tests can drive it
 * through Supertest. Route wiring lands here as each feature is built.
 */
export function createApp() {
  const app = express();

  app.use(express.json());

  app.use((_req, res) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Route not found",
      },
    });
  });

  return app;
}
