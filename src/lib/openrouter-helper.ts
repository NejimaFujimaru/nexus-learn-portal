import { database } from '@/lib/firebase';
import { get, ref } from 'firebase/database';
import { stripAiWrappers } from '@/lib/ai/json';

// Updated model list - verified available free models on OpenRouter as of 2026-02
// Source: https://openrouter.ai/models (free tier models)
// Primary: qwen/qwen3-next-80b-a3b-instruct:free
// Fallback chain: user-specified order
export const OPENROUTER_MODELS: string[] = [
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'stepfun/step-3.5-flash:free',
  'z-ai/glm-4.5-air:free',
  'google/gemma-3-27b-it:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
];

export interface OpenRouterChatParams {
  systemMessage: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
  /** Optional override to avoid an extra RTDB read when the caller already has the key */
  apiKey?: string;
}

export const getOpenRouterApiKey = async (): Promise<string> => {
  // Preferred new location (requires teacher role per RTDB rules)
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

// Make a single API call to a specific model
const callModel = async (
  model: string,
  params: OpenRouterChatParams,
  apiKey: string
): Promise<{ success: boolean; content?: string; error?: string }> => {
  const temperature = params.temperature ?? 0.4;
  const maxTokens = params.maxTokens ?? 1200;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
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

      return {
        success: false,
        error: `${model}: ${message}`,
      };
    }

    let data: any = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      return {
        success: false,
        error: `${model}: Invalid JSON response from provider.`,
      };
    }

    const content: string | undefined =
      (data?.choices?.[0]?.message?.content as string | undefined) ||
      (typeof data?.choices?.[0]?.message === 'string'
        ? (data.choices[0].message as string)
        : undefined);

    if (!content || !content.trim()) {
      return {
        success: false,
        error: `${model}: Empty response from provider.`,
      };
    }

    // Clean up common wrappers (code fences, <think> blocks). Let callers do the
    // actual JSON extraction/parsing with the robust helpers in src/lib/ai/json.ts.
    const cleanedContent = stripAiWrappers(content);

    return {
      success: true,
      content: cleanedContent,
    };
  } catch (err) {
    return {
      success: false,
      error: `${model}: ${err instanceof Error ? err.message : 'Network error'}`,
    };
  }
};

export const callOpenRouterWithFallback = async (
  params: OpenRouterChatParams,
): Promise<string> => {
  const apiKey = params.apiKey ?? (await getOpenRouterApiKey());
  
  let lastError: string = 'All AI providers failed.';

  for (const model of OPENROUTER_MODELS) {
    console.log(`[OpenRouter] Trying model: ${model}`);

    const result = await callModel(model, params, apiKey);

    if (result.success && result.content) {
      console.log(`[OpenRouter] Success with model: ${model}`);
      return result.content;
    }

    lastError = result.error || 'Unknown error';
    console.warn(`[OpenRouter] ${result.error}`);
  }

  throw new Error(lastError);
};
