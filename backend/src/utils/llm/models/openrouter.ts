import { ChatOpenAI } from '@langchain/openai'
import type { MkLLM, MkEmb, EmbeddingsLike, Msg } from './types'
 
// Primary model comes from env (OPENROUTER_MODEL). These are backups tried
// in order if the primary comes back "model unavailable / not found" (404).
// Free-tier slugs on OpenRouter rotate without notice, so this list may need
// updating over time — check https://openrouter.ai/models?fmt=table&max_price=0
const FALLBACK_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "openai/gpt-oss-20b:free",
  "qwen/qwen3-coder:free",
]
 
// Only retry on errors that mean "this model slug is dead/unavailable",
// not on things like rate limits, auth errors, or bad input.
const isModelUnavailableError = (err: any): boolean => {
  const status = err?.status ?? err?.response?.status
  const msg: string = err?.message || ""
  return (
    status === 404 ||
    /model.*(unavailable|not found|does not exist)/i.test(msg)
  )
}
 
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
 
  const primaryModel =
    cfg.openrouter_model || FALLBACK_MODELS[0]
 
  // Build the ordered list of models to try: primary first, then any
  // fallbacks not already equal to the primary.
  const modelChain = [
    primaryModel,
    ...FALLBACK_MODELS.filter((m) => m !== primaryModel),
  ]
 
  const buildClient = (model: string) =>
    new ChatOpenAI({
      model,
      apiKey: cfg.openrouter,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "https://pagelmnew-9.onrender.com",
          "X-Title": "PageLM",
        },
      },
      temperature: cfg.temp ?? 0.7,
      maxTokens: cfg.max_tokens ?? 8192,
    })
 
  const clients = modelChain.map(buildClient)
 
  const invokeWithFallback = async (ms: Msg[]) => {
    let lastErr: any
    for (let i = 0; i < clients.length; i++) {
      try {
        const result = await clients[i].invoke(ms)
        if (i > 0) {
          console.warn(
            `[OpenRouter] Primary model "${modelChain[0]}" failed, ` +
            `succeeded using fallback "${modelChain[i]}"`
          )
        }
        return result
      } catch (err: any) {
        lastErr = err
        if (!isModelUnavailableError(err)) {
          // Not a "model is dead" error (e.g. rate limit, bad request) —
          // don't burn through fallbacks, just surface it.
          throw err
        }
        console.warn(
          `[OpenRouter] Model "${modelChain[i]}" unavailable, trying next fallback...`,
          err?.message || err
        )
      }
    }
    throw lastErr
  }
 
  return {
    invoke: invokeWithFallback,
    call: invokeWithFallback,
  }
}
 
 
// OpenRouter does not provide embeddings
// Keep Gemini embeddings separate
export const makeEmbeddings: MkEmb = (_cfg: any): EmbeddingsLike => {
  throw new Error(
    "OpenRouter embeddings disabled. Use Gemini embeddings."
  )
}
 
