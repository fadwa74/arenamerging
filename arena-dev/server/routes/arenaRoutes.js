import express from "express";
import { vote, leaderboard, stats } from "../controllers/arenaController.js";

const router = express.Router();
router.post("/vote", vote);
router.get("/leaderboard/:type", leaderboard);
router.get("/leaderboard", leaderboard);
router.get("/stats", stats);
export default router;
