import {
  createVehicleSchema,
  vehicleListQuerySchema,
  type CreateVehicleInput,
} from "@dealer/shared";
import { Router, type RequestHandler } from "express";
import { parseOrThrow } from "../../lib/validation.js";
import { requireAuth } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
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

vehicleRouter.get("/vehicles/:id", requireAuth, async (req, res) => {
  const vehicle = await vehicleService.getById(String(req.params.id));
  res.status(200).json({ vehicle });
});

vehicleRouter.post("/vehicles", requireAuth, validateBody(createVehicleSchema), async (req, res) => {
  const vehicle = await vehicleService.create(req.body as CreateVehicleInput);
  res.status(201).json({ vehicle });
});
