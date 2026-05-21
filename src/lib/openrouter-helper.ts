import { database } from '@/lib/firebase';
import { get, ref } from 'firebase/database';

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export interface OpenRouterModelConfig {
  id: string;
  endpoint: string;
}

// Fallback chain (exact order requested):
// 1) Owl Alpha  2) DeepSeek V4 Flash (free)  3) Nvidia Nemotron Super (free)
export const OPENROUTER_MODEL_CONFIGS: OpenRouterModelConfig[] = [
  { id: 'openrouter/owl-alpha', endpoint: OPENROUTER_ENDPOINT },
  { id: 'deepseek/deepseek-v4-flash:free', endpoint: OPENROUTER_ENDPOINT },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', endpoint: OPENROUTER_ENDPOINT },
];

export const OPENROUTER_MODELS = OPENROUTER_MODEL_CONFIGS.map((m) => m.id);

export interface OpenRouterChatParams {
  systemMessage: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  /** Request strict JSON output (response_format json_object). */
  jsonMode?: boolean;
  /** Per-model request timeout in ms (default 45s). */
  timeoutMs?: number;
  /** Throw from here to reject a model response and continue to the next model. */
  validateContent?: (content: string, model: string) => void;
}

export const getOpenRouterApiKey = async (): Promise<string> => {
  for (const location of ['config/openrouter/apiKey', 'config/openrouterKey']) {
    const snap = await get(ref(database, location));
    const key = snap.exists() && typeof snap.val() === 'string' ? snap.val().trim() : '';
    if (key) return key;
  }
  throw new Error('OpenRouter API key is missing. Add it at config/openrouter/apiKey.');
};

const cleanAiText = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value
      .map((p) => (typeof p === 'string' ? p : p && typeof p === 'object' && 'text' in p ? String((p as any).text ?? '') : ''))
      .join('')
      .trim();
  }
  return String(value ?? '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1')
    .trim();
};

const headers = (apiKey: string): HeadersInit => ({
  Authorization: `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://nexuslearn.app',
  'X-Title': 'Nexus Learn',
});

const httpErrorMessage = (status: number, rawText: string) => {
  let providerMessage = '';
  try {
    const payload = rawText ? JSON.parse(rawText) : null;
    providerMessage = payload?.error?.message || payload?.message || '';
  } catch {
    providerMessage = rawText;
  }
  if (status === 401) return 'OpenRouter API key is invalid or missing.';
  if (status === 402) return 'OpenRouter credits required for this model.';
  if (status === 403) return 'This OpenRouter key cannot access this model.';
  if (status === 404) return 'This OpenRouter model was not found.';
  if (status === 408) return 'OpenRouter request timed out.';
  if (status === 410) return 'This OpenRouter model is no longer available.';
  if (status === 429) return 'Model is rate-limited right now.';
  if (status >= 500) return 'Model provider is temporarily unavailable.';
  return providerMessage ? providerMessage.slice(0, 220) : `OpenRouter returned HTTP ${status}.`;
};

const callSingle = async (
  model: OpenRouterModelConfig,
  params: OpenRouterChatParams,
  apiKey: string,
): Promise<string> => {
  const timeoutMs = params.timeoutMs ?? 45000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const body: Record<string, unknown> = {
    model: model.id,
    messages: [
      { role: 'system', content: params.systemMessage },
      { role: 'user', content: params.userMessage },
    ],
    temperature: params.temperature ?? 0.2,
    max_tokens: params.maxTokens ?? 1800,
  };
  if (params.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  let response: Response;
  try {
    response = await fetch(model.endpoint, {
      method: 'POST',
      headers: headers(apiKey),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') throw new Error('Model timed out.');
    throw new Error(`Network error reaching OpenRouter: ${err?.message || err}`);
  }
  clearTimeout(timer);

  const rawText = await response.text();

  if (!response.ok) {
    throw new Error(httpErrorMessage(response.status, rawText));
  }

  let payload: any;
  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    throw new Error('OpenRouter returned a non-JSON response.');
  }

  // Top-level error embedded in a 200 response
  if (payload?.error?.message) {
    throw new Error(`Provider error: ${String(payload.error.message).slice(0, 200)}`);
  }

  const choice = payload?.choices?.[0];
  if (!choice) throw new Error('Provider returned no choices.');

  // Per-choice error envelope
  if (choice.error?.message) {
    throw new Error(`Provider error: ${String(choice.error.message).slice(0, 200)}`);
  }

  const finishReason: string | undefined = choice.finish_reason ?? choice.native_finish_reason;
  if (finishReason === 'error') {
    throw new Error('Provider stopped with an error.');
  }

  const content = cleanAiText(choice.message?.content ?? choice.text ?? '');
  if (!content) {
    throw new Error(
      finishReason === 'length'
        ? 'Provider output was truncated (max_tokens reached).'
        : 'Provider returned an empty message.',
    );
  }

  if (finishReason === 'length') {
    // Surface truncation so the caller's validator can decide to skip
    throw new Error('Provider output was truncated (max_tokens reached).');
  }

  console.log(`[OpenRouter] ${model.id} ok (finish=${finishReason ?? 'n/a'}, chars=${content.length})`);
  return content;
};

export const callOpenRouterWithFallback = async (params: OpenRouterChatParams): Promise<string> => {
  const apiKey = params.apiKey ?? (await getOpenRouterApiKey());
  const errors: string[] = [];

  for (const model of OPENROUTER_MODEL_CONFIGS) {
    try {
      console.log(`[OpenRouter] Trying ${model.id}`);
      const content = await callSingle(model, params, apiKey);
      params.validateContent?.(content, model.id);
      console.log(`[OpenRouter] Success with ${model.id}`);
      return content;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error.';
      errors.push(`${model.id}: ${message}`);
      console.warn(`[OpenRouter] ${model.id} failed: ${message}`);
      if (/api key is invalid|api key is missing/i.test(message)) break;
    }
  }

  throw new Error(
    `All AI providers failed or returned empty output. Try fewer questions or shorter chapter content. Last: ${
      errors[errors.length - 1] || 'no detail'
    }`,
  );
};
