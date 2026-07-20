import db from "../config/db.js";
import { calculateElo } from "../utils/elo.js";

export const vote = (req, res) => {
  const { battle_id, winner } = req.body;
  if (!battle_id || !winner)
    return res.status(400).json({ success: false, error: "Missing fields" });

  const battle = db.prepare("SELECT * FROM battles WHERE id = ?").get(battle_id);
  if (!battle)
    return res.status(404).json({ success: false, error: "Battle not found" });

  const winner_model_id = winner === "a" ? battle.model_a_id : battle.model_b_id;
  const loser_model_id = winner === "a" ? battle.model_b_id : battle.model_a_id;

  db.prepare("INSERT INTO votes (battle_id, winner_model_id) VALUES (?, ?)")
    .run(battle_id, winner_model_id);

  const winnerModel = db.prepare("SELECT * FROM models WHERE id = ?").get(winner_model_id);
  const loserModel = db.prepare("SELECT * FROM models WHERE id = ?").get(loser_model_id);

  const { newWinnerElo, newLoserElo } = calculateElo(
    winnerModel.elo_rating,
    loserModel.elo_rating
  );

  db.prepare(
    "UPDATE models SET elo_rating = ?, wins = wins + 1 WHERE id = ?"
  ).run(newWinnerElo, winner_model_id);

  db.prepare(
    "UPDATE models SET elo_rating = ?, losses = losses + 1 WHERE id = ?"
  ).run(newLoserElo, loser_model_id);

  return res.json({
    success: true,

    winner: {
      id: winnerModel.id,
      name: winnerModel.name,
      provider: winnerModel.provider,
      elo: newWinnerElo
    },

    loser: {
      id: loserModel.id,
      name: loserModel.name,
      provider: loserModel.provider,
      elo: newLoserElo
    }
  });
};

export const leaderboard = (req, res) => {
  try {
    const { type } = req.params;

    const models = type
      ? db.prepare(`
          SELECT id, name, provider, elo_rating, wins, losses
          FROM models WHERE type = ?
          ORDER BY elo_rating DESC
        `).all(type)
      : db.prepare(`
          SELECT id, name, provider, elo_rating, wins, losses
          FROM models
          ORDER BY elo_rating DESC
        `).all();

    return res.json({ success: true, leaderboard: models });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
export const stats = (req, res) => {
  try {
    const battles = db.prepare("SELECT COUNT(*) AS total FROM battles").get().total;
    const votes = db.prepare("SELECT COUNT(*) AS total FROM votes").get().total;
    const models = db.prepare("SELECT COUNT(*) AS total FROM models").get().total;

    console.log({ battles, votes, models });

    return res.json({
      success: true,
      battles,
      votes,
      models
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
