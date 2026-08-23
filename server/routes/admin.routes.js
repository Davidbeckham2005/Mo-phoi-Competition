import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requirePin } from "../middleware/requirePin.js";
import { upload } from "../middleware/upload.js";
import * as admin from "../controllers/admin.controller.js";

const router = Router();

    router.post("/login", asyncHandler(admin.login));
router.get("/state", requirePin, asyncHandler(admin.getState));
router.get("/leaderboard", requirePin, asyncHandler(admin.getLeaderboard));
router.post("/settings", requirePin, asyncHandler(admin.saveSettings));
router.post("/prelim/open", requirePin, asyncHandler(admin.openPrelim));
router.post("/select-top", requirePin, asyncHandler(admin.selectTop));
router.post("/assign-teams", requirePin, asyncHandler(admin.assignTeams));
router.post("/demo", requirePin, asyncHandler(admin.createDemo));
router.post("/reset", requirePin, asyncHandler(admin.reset));
router.post("/teams", requirePin, asyncHandler(admin.saveTeams));
router.post("/questions/so-khao", requirePin, asyncHandler(admin.saveSoKhaoQuestion));
router.delete("/questions/so-khao/:id", requirePin, asyncHandler(admin.deleteSoKhaoQuestion));
router.post("/questions/main", requirePin, asyncHandler(admin.saveMainQuestions));
router.post("/upload", requirePin, upload.single("file"), asyncHandler(admin.uploadMedia));
router.delete("/media/:id", requirePin, asyncHandler(admin.deleteMedia));

export default router;
