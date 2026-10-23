import { vehicleListQuerySchema } from "@dealer/shared";
import { Router, type RequestHandler } from "express";
import { parseOrThrow } from "../../lib/validation.js";
import { requireAuth } from "../../middleware/auth.js";
import { vehicleService } from "./vehicles.service.js";

export const vehicleRouter = Router();

const listHandler: RequestHandler = async (req, res) => {
  const query = parseOrThrow(vehicleListQuerySchema, req.query);
  const result = await vehicleService.list(query);
  res.status(200).json(result);
};

// Both paths share one handler; the brief asks for /search but its behaviour
// is identical to the filtered list.
vehicleRouter.get("/vehicles", requireAuth, listHandler);
vehicleRouter.get("/vehicles/search", requireAuth, listHandler);
