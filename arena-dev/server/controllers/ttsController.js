import db from "../config/db.js";
import { pollJob } from "../utils/polling.js";
import { getLeastPlayedPair } from "../utils/matchmaking.js";

const buildModelString = (model) =>
  `audio/tts/${model.provider}/${model.model_id}`;

const startJob = async (prompt, modelString) => {
  const res = await fetch("https://api.edenai.run/v3/universal-ai/async", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.EDEN_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: modelString, input: { text: prompt } }),
  });
  if (!res.ok) throw new Error(`Eden AI Error: ${res.status}`);
  const data = await res.json();
  return data.public_id;
};

export const generate = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ success: false, error: "Missing prompt" });

    const [modelAId, modelBId] = getLeastPlayedPair("tts");
    const modelA = db.prepare("SELECT * FROM models WHERE id = ?").get(modelAId);
    const modelB = db.prepare("SELECT * FROM models WHERE id = ?").get(modelBId);
    if (!modelA || !modelB) return res.status(400).json({ success: false, error: "Not enough models available" });

    const promptId = db.prepare("INSERT INTO prompts (text) VALUES (?)").run(prompt).lastInsertRowid;

    const [jobIdA, jobIdB] = await Promise.all([
      startJob(prompt, buildModelString(modelA)),
      startJob(prompt, buildModelString(modelB)),
    ]);

    const [outputA, outputB] = await Promise.all([pollJob(jobIdA), pollJob(jobIdB)]);

    const battleResult = db.prepare(`
      INSERT INTO battles (prompt_id, model_a_id, model_b_id, output_a, output_b)
      VALUES (?, ?, ?, ?, ?)
    `).run(promptId, modelA.id, modelB.id, outputA.audio_resource_url, outputB.audio_resource_url);

    return res.json({
      success: true,
      battle_id: battleResult.lastInsertRowid,
      output_a: outputA.audio_resource_url,
      output_b: outputB.audio_resource_url,
    });
  } catch (err) {
    console.error("TTS generation error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
