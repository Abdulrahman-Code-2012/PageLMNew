import { ChatOpenAI } from '@langchain/openai'
import { wrapChat } from './util'
import type { MkLLM, MkEmb, EmbeddingsLike } from './types'

export const makeLLM: MkLLM = (cfg: any) => {
  console.log("[OpenRouter Debug]", {
    keyExists: !!cfg.openrouter,
    keyPrefix: cfg.openrouter
      ? cfg.openrouter.substring(0, 9) + "..."
      : "MISSING",
    model: cfg.openrouter_model,
    baseURL: "https://openrouter.ai/api/v1",
  });

  const m = new ChatOpenAI({
    model: cfg.openrouter_model || "google/gemini-2.5-flash",
    apiKey: cfg.openrouter || "",
    configuration: {
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://pagelmnew-9.onrender.com",
    "X-Title": "PageLM"
  }
},
    temperature: cfg.temp ?? 0.7,
    maxTokens: cfg.max_tokens,
  });

  return wrapChat(m);
};


// OpenRouter does not provide embeddings
// Use EMB_PROVIDER=gemini instead
export const makeEmbeddings: MkEmb = (_cfg: any): EmbeddingsLike => {
  throw new Error("OpenRouter embeddings disabled. Use Gemini embeddings.");
};
