import db from './config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

db.exec(schema);
const insert = db.prepare(`
    INSERT OR IGNORE INTO models (name, provider, model_id, type)
    VALUES (?, ?, ?, ?)
`);

// =====================
// Video Generation
// =====================
[
    //["PixVerse V6", "pixverse", "v6", "video"],                       These two don't work yet
    //["Seedance 2", "bytedance", "seedance-2-0-260128", "video"],
    ["Veo 3.1", "google", "veo-3.1-fast-generate-preview", "video"],
    ["Hailuo 2.3", "minimax", "MiniMax-Hailuo-2.3", "video"],
    ["Sora 2", "openai", "sora-2", "video"]
].forEach(model => insert.run(...model));

// =====================
// Text-to-Speech
// =====================
[
    ["Eleven Multilingual v2", "elevenlabs", "eleven_multilingual_v2", "tts"],
    ["Eleven Turbo v2.5", "elevenlabs", "eleven_turbo_v2_5", "tts"],
    ["OpenAI TTS-1 HD", "openai", "tts-1-hd", "tts"],
    ["Amazon Neural", "amazon", "neural", "tts"],
    ["Google Chirp 3 HD", "google", "chirp-3-hd", "tts"]
].forEach(model => insert.run(...model));

// =====================
// Image Generation
// =====================
[
    ["GPT Image 2", "openai", "gpt-image-2", "image"],
    ["Imagen 4", "google", "imagen-4.0-fast-generate-001", "image"],
    ["Gemini 3", "google", "gemini-3-pro-image-preview", "image"],
    ["Stable Diffusion XL", "stabilityai", "stable-diffusion-xl-1024-v1-0", "image"],
    ["Seedreem 5", "bytedance", "seedream-5-0-260128", "image"],
    ["Leonardo Lightning XL", "leonardo", "Leonardo Lightning XL", "image"],
].forEach(model => insert.run(...model));

// =====================
// Text Generation
// =====================
[
    ["GPT-5", "openai", "gpt-5", "text"],
    ["Claude Sonnet 5", "anthropic", "claude-sonnet-5", "text"],
    ["Gemini 3.5 Flash", "google", "gemini-3.5-flash", "text"],
    ["DeepSeek V4 Pro", "deepseek", "deepseek-v4-pro", "text"]
].forEach(model => insert.run(...model));

console.log("Database initialized.");
