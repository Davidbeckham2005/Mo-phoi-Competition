import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { getPublic } from "../controllers/public.controller.js";

const router = Router();
router.get("/public", asyncHandler(getPublic));
export default router;
