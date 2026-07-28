import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env')

if (fs.existsSync(envPath)) {
  process.loadEnvFile(envPath)
}

export const config = {
  db_mode: process.env.db_mode || 'json',

  url: process.env.VITE_BACKEND_URL || '',
  timeout: Number(process.env.VITE_TIMEOUT || 90000),

  // AI Provider
  provider: process.env.LLM_PROVIDER || 'openrouter',
  embeddings_provider: process.env.EMB_PROVIDER || 'gemini',

  // =========================
  // OpenRouter
  // =========================
  openrouter:
    process.env.OPENROUTER_API_KEY || '',

  openrouter_model:
    process.env.OPENROUTER_MODEL ||
    'google/gemini-2.0-flash-lite-001:free',


  // =========================
  // Gemini
  // =========================
  gemini:
    process.env.GOOGLE_API_KEY ||
    process.env.gemini ||
    '',

  gemini_model:
    process.env.GEMINI_MODEL ||
    'gemini-1.5-pro',

  gemini_embed_model:
    process.env.GEMINI_EMBED_MODEL ||
    'models/gemini-embedding-001',


  // =========================
  // OpenAI
  // =========================
  openai:
    process.env.OPENAI_API_KEY || '',

  openai_embed:
    process.env.OPENAI_EMBED_API_KEY || '',

  openai_model:
    process.env.OPENAI_MODEL ||
    'gpt-4o-mini',

  openai_embed_model:
    process.env.OPENAI_EMBED_MODEL ||
    'text-embedding-3-large',


  // =========================
  // LLM Settings
  // =========================
  temp:
    Number(process.env.LLM_TEMP || 0.7),

  max_tokens:
    Number(process.env.LLM_MAXTOK || 8192),


  // =========================
  // Server
  // =========================
  port:
    Number(process.env.PORT || 5000),

  baseUrl:
    process.env.VITE_BACKEND_URL ||
    'http://localhost:5000',

  frontendUrl:
    process.env.VITE_FRONTEND_URL ||
    'http://localhost:5173',


  // =========================
  // TTS
  // =========================
  tts_provider:
    process.env.TTS_PROVIDER ||
    'edge',

  ffmpeg:
    process.env.FFMPEG_PATH ||
    'ffmpeg',


  // =========================
  // Transcription
  // =========================
  transcription_provider:
    process.env.TRANSCRIPTION_PROVIDER ||
    'openai',

  assemblyai_api_key:
    process.env.ASSEMBLYAI_API_KEY ||
    '',


  google_project_id:
    process.env.GOOGLE_CLOUD_PROJECT_ID ||
    '',
}
