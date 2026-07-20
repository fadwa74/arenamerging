import express from "express";
import { generate } from "../controllers/ttsController.js";
import { ttsLimiter } from "../middleware/rateLimiter.js";
import { sessionGenerateLimit } from "../middleware/sessionLimiter.js";

const router = express.Router();
router.post("/generate", ttsLimiter, sessionGenerateLimit("tts"), generate);
export default router;
