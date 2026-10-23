import { restockSchema, type RestockInput } from "@dealer/shared";
import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { inventoryService } from "./inventory.service.js";

export const inventoryRouter = Router();

inventoryRouter.post("/vehicles/:id/purchase", requireAuth, async (req, res) => {
  const result = await inventoryService.purchase(req.user!.id, String(req.params.id));
  res.status(200).json(result);
});

inventoryRouter.post(
  "/vehicles/:id/restock",
  requireAuth,
  requireAdmin,
  validateBody(restockSchema),
  async (req, res) => {
    const { quantity } = req.body as RestockInput;
    const vehicle = await inventoryService.restock(String(req.params.id), quantity);
    res.status(200).json({ vehicle });
  },
);

inventoryRouter.get("/purchases", requireAuth, async (req, res) => {
  const result = await inventoryService.listPurchases(req.user!.id);
  res.status(200).json(result);
});
