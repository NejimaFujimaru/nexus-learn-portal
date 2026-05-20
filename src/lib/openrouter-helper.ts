import { database } from '@/lib/firebase';
import { get, ref } from 'firebase/database';

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export interface OpenRouterModelConfig {
  id: string;
  endpoint: string;
}

// Requested OpenRouter fallback chain. All three use OpenRouter's Chat Completions
// endpoint with the same required OpenRouter headers/auth; only the model id changes.
export const OPENROUTER_MODEL_CONFIGS: OpenRouterModelConfig[] = [
  { id: 'deepseek/deepseek-v4-flash:free', endpoint: OPENROUTER_ENDPOINT },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', endpoint: OPENROUTER_ENDPOINT },
  { id: 'openrouter/owl-alpha', endpoint: OPENROUTER_ENDPOINT },
];

export const OPENROUTER_MODELS = OPENROUTER_MODEL_CONFIGS.map((model) => model.id);

export interface OpenRouterChatParams {
  systemMessage: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  /** Throw from here to reject a model response and continue to the next model. */
  validateContent?: (content: string, model: string) => void;
}

export const getOpenRouterApiKey = async (): Promise<string> => {
  const locations = ['config/openrouter/apiKey', 'config/openrouterKey'];

  for (const location of locations) {
    const snapshot = await get(ref(database, location));
    const key = snapshot.exists() && typeof snapshot.val() === 'string' ? snapshot.val().trim() : '';
    if (key) return key;
  }

  throw new Error('OpenRouter API key is missing. Add it at config/openrouter/apiKey.');
};

const cleanAiText = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) return String((part as any).text ?? '');
        return '';
      })
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

const openRouterHeaders = (apiKey: string): HeadersInit => ({
  Authorization: `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://nexuslearn.app',
  'X-Title': 'Nexus Learn',
});

const readOpenRouterError = (status: number, rawText: string) => {
  let providerMessage = '';
  try {
    const payload = rawText ? JSON.parse(rawText) : null;
    providerMessage = payload?.error?.message || payload?.message || '';
  } catch {
    providerMessage = rawText;
  }

  if (status === 401) return 'OpenRouter API key is invalid or missing.';
  if (status === 402) return 'OpenRouter credits/payment are required for this model.';
  if (status === 403) return 'This OpenRouter key cannot access this model.';
  if (status === 404) return 'This OpenRouter model was not found.';
  if (status === 408) return 'OpenRouter request timed out.';
  if (status === 410) return 'This OpenRouter model is no longer available.';
  if (status === 429) return 'This model is rate-limited right now.';
  if (status >= 500) return 'The model provider is temporarily unavailable.';

  return providerMessage ? providerMessage.slice(0, 220) : `OpenRouter returned HTTP ${status}.`;
};

const callSingleOpenRouterModel = async (
  model: OpenRouterModelConfig,
  params: OpenRouterChatParams,
  apiKey: string,
): Promise<string> => {
  const response = await fetch(model.endpoint, {
    method: 'POST',
    headers: openRouterHeaders(apiKey),
    body: JSON.stringify({
      model: model.id,
      messages: [
        { role: 'system', content: params.systemMessage },
        { role: 'user', content: params.userMessage },
      ],
      temperature: params.temperature ?? 0.2,
      max_tokens: params.maxTokens ?? 1800,
    }),
  });

  const rawText = await response.text();

  if (!response.ok) {
    throw new Error(readOpenRouterError(response.status, rawText));
  }

  let payload: any;
  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    throw new Error('OpenRouter returned a non-JSON API response.');
  }

  const message = payload?.choices?.[0]?.message;
  const content = cleanAiText(message?.content ?? payload?.choices?.[0]?.text ?? '');

  if (!content) {
    throw new Error('The model returned an empty message.');
  }

  return content;
};

export const callOpenRouterWithFallback = async (params: OpenRouterChatParams): Promise<string> => {
  const apiKey = params.apiKey ?? (await getOpenRouterApiKey());
  const errors: string[] = [];

  for (const model of OPENROUTER_MODEL_CONFIGS) {
    try {
      console.log(`[OpenRouter] Trying ${model.id}`);
      const content = await callSingleOpenRouterModel(model, params, apiKey);
      params.validateContent?.(content, model.id);
      console.log(`[OpenRouter] Success with ${model.id}`);
      return content;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown OpenRouter error.';
      errors.push(`${model.id}: ${message}`);
      console.warn(`[OpenRouter] ${model.id} failed: ${message}`);

      if (/api key is invalid|api key is missing/i.test(message)) {
        break;
      }
    }
  }

  throw new Error(`All requested OpenRouter models failed. ${errors[errors.length - 1] || ''}`.trim());
};
