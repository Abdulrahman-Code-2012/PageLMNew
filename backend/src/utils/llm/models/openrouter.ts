import { ChatOpenAI } from '@langchain/openai'
import { wrapChat } from './util'
import type { MkLLM, MkEmb, EmbeddingsLike } from './types'

export const makeLLM: MkLLM = (cfg: any) => {
  console.log("[OpenRouter Debug]", {
    keyExists: !!cfg.openrouter,
    keyLength: cfg.openrouter?.length || 0,
    keyPrefix: cfg.openrouter
      ? cfg.openrouter.substring(0, 12) + "..."
      : "MISSING",
    model: cfg.openrouter_model,
    baseURL: "https://openrouter.ai/api/v1",
  })

  if (!cfg.openrouter) {
    throw new Error("Missing OPENROUTER_API_KEY")
  }

  const m = new ChatOpenAI({
    model:
      cfg.openrouter_model ||
      "google/gemini-2.0-flash-lite-001:free",

    apiKey: cfg.openrouter,

    configuration: {
      baseURL: "https://openrouter.ai/api/v1",

      defaultHeaders: {
        "HTTP-Referer": "https://pagelmnew-9.onrender.com",
        "X-Title": "PageLM",
      },
    },

    temperature: cfg.temp ?? 0.7,

    maxTokens:
      cfg.max_tokens ??
      8192,
  })

  return wrapChat(m)
}


// OpenRouter does not provide embeddings
// Keep Gemini embeddings separate
export const makeEmbeddings: MkEmb = (_cfg: any): EmbeddingsLike => {
  throw new Error(
    "OpenRouter embeddings disabled. Use Gemini embeddings."
  )
}
