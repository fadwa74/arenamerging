import express from "express";
import { generate } from "../controllers/textController.js";
import { textLimiter } from "../middleware/rateLimiter.js";
import { sessionGenerateLimit } from "../middleware/sessionLimiter.js";

const router = express.Router();
router.post("/generate", textLimiter, sessionGenerateLimit("text"), generate);
export default router;
