import db from "../config/db.js";
import { pollJob } from "../utils/polling.js";
import { getLeastPlayedPair } from "../utils/matchmaking.js";

const EDEN_IMAGE_ENDPOINT = "https://api.edenai.run/v3/universal-ai";
const MODEL_CONFIG = {
  "image/generation/openai/gpt-image-2": {
    resolution: "1024x1024",
  },
  "image/generation/bytedance/seedream-5-0-260128": {
    resolution: "2048x2048",
  },
  "image/generation/google/gemini-3-pro-image-preview": {
    resolution: "1024x1024",
  },
  "image/generation/google/imagen-4.0-fast-generate-001": {
    resolution: "1024x1024",
  },
  "image/generation/stabilityai/stable-diffusion-xl-1024-v1-0": {
    resolution: "1024x1024",
  },
  "image/generation/leonardo/Leonardo Lightning XL": {
    resolution: "1024x1024",
  },
};

const buildModelString = (model) =>
  `image/generation/${model.provider}/${model.model_id}`;

const startJob = async (prompt, modelString) => {
  const config = MODEL_CONFIG[modelString];
  const res = await fetch("https://api.edenai.run/v3/universal-ai", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.EDEN_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelString,
      input: { 
        text: prompt, 
        ...config
      }
    }),
  });
  const body = await res.text();

  console.log("Status:", res.status);
  
  if (!res.ok) {
    throw new Error(`Eden AI ${res.status}: ${body}`);
  }
  
  const data = JSON.parse(body);
  return data?.output?.items?.[0];
};

export const generate = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: "Missing prompt"
      });
    }

    console.log("Image Battle:", prompt);

    const [modelAId, modelBId] = getLeastPlayedPair("image");
    const modelA = db.prepare("SELECT * FROM models WHERE id = ?").get(modelAId);
    const modelB = db.prepare("SELECT * FROM models WHERE id = ?").get(modelBId);
    if (!modelA || !modelB) return res.status(400).json({ success: false, error: "Not enough models available" });

    console.log("Battle:", modelA.name, "VS", modelB.name);

    
    const promptId = Number(db.prepare("INSERT INTO prompts (text) VALUES (?)").run(prompt).lastInsertRowid);

    const [resultA, resultB] = await Promise.allSettled([
      startJob(prompt, buildModelString(modelA)),
      startJob(prompt, buildModelString(modelB)),
    ]);

    const outputA = resultA.status === "fulfilled"
      ? { success: true,  url: resultA.value.image_resource_url }
      : { success: false, error: resultA.reason.message };

    const outputB = resultB.status === "fulfilled"
      ? { success: true,  url: resultB.value.image_resource_url }
      : { success: false, error: resultB.reason.message };

    const battle = db.prepare(`
      INSERT INTO battles (prompt_id, model_a_id, model_b_id, output_a, output_b)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      promptId,
      modelA.id,
      modelB.id,
      outputA.url || null,
      outputB.url || null
    );

    return res.json({
      success: true,
      battle_id: battle.lastInsertRowid,
      model_a_name: modelA.name,
      model_b_name: modelB.name,
      elo_a: modelA.elo_rating,
      elo_b: modelB.elo_rating,
      image_a_url: outputA.url || null,
      image_b_url: outputB.url || null,
      output_a: outputA,
      output_b: outputB
    });

  } catch (err) {
    console.error("Image generation error:", err);
    return res.status(500).json({ success: false, error: err.message});
  }
}
