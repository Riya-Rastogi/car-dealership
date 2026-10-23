import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from "@dealer/shared";
import { Router } from "express";
import { validateBody } from "../../middleware/validate.js";
import { authService } from "./auth.service.js";

export const authRouter = Router();

authRouter.post("/auth/register", validateBody(registerSchema), async (req, res) => {
  const result = await authService.register(req.body as RegisterInput);
  res.status(201).json(result);
});

authRouter.post("/auth/login", validateBody(loginSchema), async (req, res) => {
  const result = await authService.login(req.body as LoginInput);
  res.status(200).json(result);
});
