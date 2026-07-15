import db from "../config/db.js";

export const getLeastPlayedPair = (type) => {
  const models = db.prepare("SELECT id FROM models WHERE type = ?").all(type);
  if (models.length < 2) throw new Error("Need at least 2 models to matchmake");

  const pairs = [];
  for (let i = 0; i < models.length; i++)
    for (let j = i + 1; j < models.length; j++)
      pairs.push([models[i].id, models[j].id]);

  const voteCounts = db.prepare(`
    SELECT b.model_a_id, b.model_b_id, COUNT(v.id) as count
    FROM battles b
    LEFT JOIN votes v ON v.battle_id = b.id
    GROUP BY b.model_a_id, b.model_b_id
  `).all();

  const countMap = new Map();
  for (const row of voteCounts) {
    const key = [row.model_a_id, row.model_b_id].sort().join(":");
    countMap.set(key, (countMap.get(key) || 0) + row.count);
  }

  const pairKey = ([a, b]) => [a, b].sort().join(":");
  const minCount = Math.min(...pairs.map(p => countMap.get(pairKey(p)) || 0));
  const leastPlayed = pairs.filter(p => (countMap.get(pairKey(p)) || 0) === minCount);
  const chosen = leastPlayed[Math.floor(Math.random() * leastPlayed.length)];
  const swap = Math.random() < 0.5;
  return swap ? [chosen[1], chosen[0]] : [chosen[0], chosen[1]];
};
