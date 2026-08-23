import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { register } from "../controllers/contestants.controller.js";

const router = Router();
router.post("/register", asyncHandler(register));
export default router;
