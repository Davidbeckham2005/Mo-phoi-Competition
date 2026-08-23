import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requirePin } from "../middleware/requirePin.js";
import * as control from "../controllers/control.controller.js";

const router = Router();
router.get("/current-question", requirePin, asyncHandler(control.currentQuestion));
router.post("/:action", requirePin, asyncHandler(control.runAction));
export default router;
