import { database } from '@/lib/firebase';
import { get, ref } from 'firebase/database';

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL_ID = 'openrouter/free';

export const OPENROUTER_MODELS = [MODEL_ID];

export interface OpenRouterChatParams {
  systemMessage: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  jsonMode?: boolean;
  timeoutMs?: number;
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

export const callOpenRouterWithFallback = async (params: OpenRouterChatParams): Promise<string> => {
  const apiKey = params.apiKey ?? (await getOpenRouterApiKey());
  const timeoutMs = params.timeoutMs ?? 60000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const body: Record<string, unknown> = {
    model: MODEL_ID,
    models: [MODEL_ID],
    route: 'fallback',
    provider: { sort: 'price', allow_fallbacks: true },
    messages: [
      { role: 'system', content: params.systemMessage },
      { role: 'user', content: params.userMessage },
    ],
    temperature: params.temperature ?? 0.2,
    max_tokens: params.maxTokens ?? 1800,
  };
  if (params.jsonMode) body.response_format = { type: 'json_object' };

  let response: Response;
  try {
    response = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://nexuslearn.app',
        'X-Title': 'Nexus Learn',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timer);
    throw new Error(err?.name === 'AbortError' ? 'AI request timed out.' : `Network error: ${err?.message || err}`);
  }
  clearTimeout(timer);

  const rawText = await response.text();

  if (!response.ok) {
    let msg = `OpenRouter HTTP ${response.status}`;
    try {
      const p = JSON.parse(rawText);
      msg = p?.error?.message || msg;
    } catch {}
    throw new Error(msg);
  }

  let payload: any;
  try {
    payload = JSON.parse(rawText);
  } catch {
    throw new Error('OpenRouter returned non-JSON response.');
  }

  if (payload?.error?.message) throw new Error(`Provider error: ${payload.error.message}`);

  const choice = payload?.choices?.[0];
  if (!choice) throw new Error('Provider returned no choices.');
  if (choice.error?.message) throw new Error(`Provider error: ${choice.error.message}`);

  const finishReason = choice.finish_reason ?? choice.native_finish_reason;
  const content = cleanAiText(choice.message?.content ?? choice.text ?? '');

  if (!content) {
    throw new Error(
      finishReason === 'length'
        ? 'AI output was truncated. Try fewer questions or shorter content.'
        : 'AI returned an empty response. Try again.',
    );
  }

  console.log(`[OpenRouter] ok via ${payload?.model || MODEL_ID} (finish=${finishReason}, chars=${content.length})`);
  params.validateContent?.(content, payload?.model || MODEL_ID);
  return content;
};
