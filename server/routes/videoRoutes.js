import express from "express";
import { generate } from "../controllers/videoController.js";
import { videoLimiter } from "../middleware/rateLimiter.js";
import { sessionGenerateLimit } from "../middleware/sessionLimiter.js";

const router = express.Router();
router.post("/generate", videoLimiter, sessionGenerateLimit("video"), generate);
export default router;
