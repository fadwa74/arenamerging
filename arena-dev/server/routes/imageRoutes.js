import express from "express";
import { generate } from "../controllers/imageController.js";
import { imageLimiter } from "../middleware/rateLimiter.js";
import { sessionGenerateLimit } from "../middleware/sessionLimiter.js";

const router = express.Router();
router.post("/generate", imageLimiter, sessionGenerateLimit("image"), generate);
export default router;
