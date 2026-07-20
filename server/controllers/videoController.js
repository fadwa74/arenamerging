import db from "../config/db.js";
import { pollJob } from "../utils/polling.js";
import { getLeastPlayedPair } from "../utils/matchmaking.js";

const EDEN_IMAGE_ENDPOINT = "https://api.edenai.run/v3/universal-ai";
const MODEL_CONFIG = {
  "video/generation_async/openai/sora-2": {
    duration: 4,
  },
  "video/generation_async/bytedance/seedance-2-0-260128": {
    duration: 4
  },
  "video/generation_async/google/veo-3.1-fast-generate-preview": {
    duration: 4
  },
  "video/generation_async/minimax/MiniMax-Hailuo-2.3": {
    duration: 6
  },
  "video/generation_async/pixverse/v6": {
    duration: 4
  },
};

const buildModelString = (model) =>
  `video/generation_async/${model.provider}/${model.model_id}`;

const startJob = async (prompt, modelString) => {
  const config = MODEL_CONFIG[modelString];
  const res = await fetch(
    "https://api.edenai.run/v3/universal-ai/async",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.EDEN_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: modelString,
        input: {
          text: prompt,
          ...config
        }
      })
    }
  );
  
  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data?.detail?.message ||
      data?.error?.message ||
      "Eden video generation failed"
    );
  }

  if (!data.public_id) throw new Error("No job id returned from Eden");

  return data.public_id;
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

    const [modelAId, modelBId] = getLeastPlayedPair("video");

    const modelA = db.prepare("SELECT * FROM models WHERE id = ?").get(modelAId);
    const modelB = db.prepare("SELECT * FROM models WHERE id = ?").get(modelBId);

    if (!modelA || !modelB) {
      return res.status(400).json({
        success: false,
        error: "Not enough video models"
      });
    }

    console.log("Battle:", modelA.name, "VS", modelB.name);

    const promptId = Number(
      db.prepare("INSERT INTO prompts(text) VALUES(?)")
        .run(prompt)
        .lastInsertRowid
    );

    const [
      jobA,
      jobB
    ] = await Promise.allSettled([
      startJob(prompt, buildModelString(modelA)),
      startJob(prompt, buildModelString(modelB))
    ]);

    if (jobA.status === "rejected" || jobB.status === "rejected") {
      throw new Error(
        jobA.reason?.message ||
        jobB.reason?.message ||
        "Failed to start video generation"
      );
    }

    const [
      resultA,
      resultB
    ] = await Promise.allSettled([
      pollJob(jobA.value),
      pollJob(jobB.value)
    ]);

    const outputA = resultA.status === "fulfilled"
      ? { success: true, url: resultA.value.video_resource_url }
      : { success: false, error: resultA.reason.message };

    const outputB = resultB.status === "fulfilled"
      ? { success: true, url: resultB.value.video_resource_url }
      : { success: false, error: resultB.reason.message };

    console.log("VIDEO A:", outputA);
    console.log("VIDEO B:", outputB);

    const battle = db.prepare(
      `
      INSERT INTO battles
      (
        prompt_id,
        model_a_id,
        model_b_id,
        output_a,
        output_b
      )
      VALUES(?,?,?,?,?)
      `
    ).run(
      promptId,
      modelA.id,
      modelB.id,
      outputA.success ? outputA.url : null,
      outputB.success ? outputB.url : null
    );

    if (!outputA.success && !outputB.success) {
  return res.json({
    success: false,
    error: "Video generation failed",
    battle_id: battle.lastInsertRowid,
    output_a: outputA,
    output_b: outputB
  });
}

    return res.json({
      success: true,
      battle_id: battle.lastInsertRowid,
      model_a_name: modelA.name,
      model_b_name: modelB.name,
      elo_a: modelA.elo_rating,
      elo_b: modelB.elo_rating,
      video_a_url: outputA.url,
      video_b_url: outputB.url,
      output_a: outputA,
      output_b: outputB
    });

  } catch (err) {
    console.error("Video generation error:", err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
