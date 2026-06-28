import { database } from '@/lib/firebase';
import { get, ref } from 'firebase/database';

// Single model: OpenRouter's free auto-router picks the best available free model.
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL_ID = 'openrouter/auto';

export const OPENROUTER_MODELS = [MODEL_ID];

export interface OpenRouterChatParams {
  systemMessage: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  jsonMode?: boolean;
  timeoutMs?: number;
}

export const getOpenRouterApiKey = async (): Promise<string> => {
  for (const path of ['config/openrouter/apiKey', 'config/openrouterKey']) {
    const snap = await get(ref(database, path));
    const v = snap.exists() && typeof snap.val() === 'string' ? snap.val().trim() : '';
    if (v) return v;
  }
  throw new Error('OpenRouter API key missing. Set it at config/openrouter/apiKey.');
};

const extractContent = (choice: any): string => {
  const c = choice?.message?.content ?? choice?.text ?? '';
  if (Array.isArray(c)) {
    return c
      .map((p) => (typeof p === 'string' ? p : p?.text ?? ''))
      .join('')
      .trim();
  }
  return String(c ?? '').trim();
};

export const callOpenRouterWithFallback = async (params: OpenRouterChatParams): Promise<string> => {
  const apiKey = params.apiKey ?? (await getOpenRouterApiKey());
  const timeoutMs = params.timeoutMs ?? 60000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const body: Record<string, unknown> = {
    model: MODEL_ID,
    messages: [
      { role: 'system', content: params.systemMessage },
      { role: 'user', content: params.userMessage },
    ],
    temperature: params.temperature ?? 0.2,
    max_tokens: params.maxTokens ?? 2000,
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

  const text = await response.text();

  if (!response.ok) {
    let msg = `OpenRouter HTTP ${response.status}`;
    try { msg = JSON.parse(text)?.error?.message || msg; } catch {}
    throw new Error(msg);
  }

  let payload: any;
  try { payload = JSON.parse(text); } catch { throw new Error('OpenRouter returned non-JSON.'); }

  if (payload?.error?.message) throw new Error(`Provider error: ${payload.error.message}`);

  const choice = payload?.choices?.[0];
  if (!choice) throw new Error('Provider returned no choices.');
  if (choice.error?.message) throw new Error(`Provider error: ${choice.error.message}`);

  const content = extractContent(choice);
  const finish = choice.finish_reason ?? choice.native_finish_reason;

  if (!content) {
    throw new Error(
      finish === 'length'
        ? 'AI output was cut off (token limit). Try fewer questions.'
        : 'AI returned an empty response. Please try again.',
    );
  }

  console.log(`[OpenRouter] ok via ${payload?.model || MODEL_ID} (finish=${finish}, chars=${content.length})`);
  return content;
};
