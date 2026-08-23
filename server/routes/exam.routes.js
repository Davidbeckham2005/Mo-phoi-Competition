import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as examController from "../controllers/exam.controller.js";

const router = Router();
router.post("/start", asyncHandler(examController.start));
router.post("/answer", asyncHandler(examController.answer));
router.post("/submit", asyncHandler(examController.submit));
router.get("/status/:id", asyncHandler(examController.status));
router.get("/result/:id", asyncHandler(examController.result));
export default router;
