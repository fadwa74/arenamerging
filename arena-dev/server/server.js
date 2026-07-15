// server/server.js
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Check both possible .env locations
const candidatePaths = [
  path.join(__dirname, '.env'),        // arena-dev/server/.env
  path.join(__dirname, '..', '.env')   // arena-dev/.env
];

let loadedFrom = null;
for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    loadedFrom = p;
    break;
  }
}

console.log('📂 .env loaded from:', loadedFrom || '❌ NOT FOUND IN EITHER LOCATION');
console.log('🔑 EDEN_API_KEY:', process.env.EDEN_API_KEY ? '✅ YES' : '❌ NO');

import express from 'express';
import cors from 'cors';
import session from 'express-session';

import videoRoutes from './routes/videoRoutes.js';
import textRoutes from './routes/textRoutes.js';
import imageRoutes from './routes/imageRoutes.js';
import ttsRoutes from './routes/ttsRoutes.js';
import arenaRoutes from './routes/arenaRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

// Session middleware MUST come before routes that might use req.session
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_dev_secret_change_me',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,  // 24 hours
    httpOnly: true,
  },
}));

// routes
app.use('/api/video', videoRoutes);
app.use('/api/image', imageRoutes);
app.use('/api/text', textRoutes);
app.use('/api/tts', ttsRoutes);
app.use('/api/arena', arenaRoutes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));