import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { login } from "../controllers/team.controller.js";

const router = Router();
router.post("/login", asyncHandler(login));
export default router;
