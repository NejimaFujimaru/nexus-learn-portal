import { database } from '@/lib/firebase';
import { get, ref } from 'firebase/database';

// Updated model list - removed deprecated Mistral models
// Primary: qwen/qwen3-next-80b-a3b-instruct:free (most capable free model)
// Fallback chain: verified available models on OpenRouter as of 2026-02
export const OPENROUTER_MODELS: string[] = [
  'qwen/qwen3-next-80b-a3b-instruct:free',  // Primary - best free model
  'qwen/qwen3-4b:free',                      // Fallback 1 - smaller Qwen
  'deepseek/deepseek-r1-0528:free',          // Fallback 2 - DeepSeek reasoning
  'google/gemma-3-27b-it:free',              // Fallback 3 - Google Gemma
  'meta-llama/llama-4-scout:free',           // Fallback 4 - Meta Llama 4
];

export interface OpenRouterChatParams {
  systemMessage: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
}

export const getOpenRouterApiKey = async (): Promise<string> => {
  // Preferred new location
  const primaryRef = ref(database, 'config/openrouter/apiKey');
  const primarySnap = await get(primaryRef);
  let raw: unknown = primarySnap.exists() ? primarySnap.val() : '';
  let key = typeof raw === 'string' ? raw.trim() : '';

  // Backwards‑compat: support legacy config/openrouterKey used in early versions
  if (!key) {
    const legacyRef = ref(database, 'config/openrouterKey');
    const legacySnap = await get(legacyRef);
    raw = legacySnap.exists() ? legacySnap.val() : '';
    key = typeof raw === 'string' ? raw.trim() : '';
  }

  if (!key) {
    throw new Error(
      'OpenRouter API key not found. Expected at config/openrouter/apiKey or legacy config/openrouterKey in Firebase Realtime Database.'
    );
  }

  return key;
};

export const callOpenRouterWithFallback = async (
  params: OpenRouterChatParams,
): Promise<string> => {
  const apiKey = await getOpenRouterApiKey();
  const temperature = params.temperature ?? 0.4;
  const maxTokens = params.maxTokens ?? 1200;

  let lastError: unknown = null;

  for (const model of OPENROUTER_MODELS) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Nexus Learn',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: params.systemMessage },
            { role: 'user', content: params.userMessage },
          ],
          temperature,
          max_tokens: maxTokens,
        }),
      });

      const rawText = await response.text();

      if (!response.ok) {
        let payload: any = null;
        try {
          payload = rawText ? JSON.parse(rawText) : null;
        } catch {
          payload = null;
        }

        const message: string =
          payload?.error?.message ||
          (response.status === 401
            ? 'Invalid or missing OpenRouter API key.'
            : response.status === 403
            ? 'Access to this model is forbidden. Check your OpenRouter account.'
            : response.status === 404
            ? 'Model not found on OpenRouter.'
            : response.status === 410
            ? 'Model has been deprecated/removed from OpenRouter.'
            : response.status === 429
            ? 'Rate limit reached for this model.'
            : response.status >= 500
            ? 'Provider is temporarily unavailable.'
            : `HTTP ${response.status}`);

        // If this looks like a provider / routing issue, try next model
        const lower = message.toLowerCase();
        const retryable =
          response.status === 404 ||  // Model not found - try next
          response.status === 410 ||  // Model deprecated - try next
          response.status === 429 ||
          response.status >= 500 ||
          lower.includes('no endpoints') ||
          lower.includes('overloaded') ||
          lower.includes('unavailable');

        lastError = new Error(`${model}: ${message}`);
        console.warn(`OpenRouter model ${model} failed:`, message);

        if (retryable) {
          continue;
        }

        // Non-retryable – fail fast
        throw lastError;
      }

      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch (e) {
        lastError = e;
        continue;
      }

      const content: string | undefined =
        (data?.choices?.[0]?.message?.content as string | undefined) ||
        (typeof data?.choices?.[0]?.message === 'string'
          ? (data.choices[0].message as string)
          : undefined);

      if (!content || !content.trim()) {
        lastError = new Error(`${model}: Empty response from provider.`);
        continue;
      }

      return content;
    } catch (err) {
      lastError = err;
      // Try next model
    }
  }

  const finalMessage =
    lastError instanceof Error && lastError.message
      ? lastError.message
      : 'All AI providers failed. Please try again later.';

  throw new Error(finalMessage);
};
