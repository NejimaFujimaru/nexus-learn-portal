import { database } from '@/lib/firebase';
import { get, ref } from 'firebase/database';

// Updated model list - verified available free models on OpenRouter as of 2026-02
// Source: https://openrouter.ai/models (free tier models)
// Primary: meta-llama/llama-3.3-70b-instruct:free (GPT-4 level, most reliable)
// Fallback chain: verified working models
export const OPENROUTER_MODELS: string[] = [
  'meta-llama/llama-3.3-70b-instruct:free',    // Primary - GPT-4 level, 131K context
  'google/gemini-2.0-flash-exp:free',          // Fallback 1 - 1M context, fast
  'google/gemma-3-27b-it:free',                // Fallback 2 - Multimodal
  'deepseek/deepseek-r1-0528:free',            // Fallback 3 - Strong reasoning
  'mistralai/mistral-small-3.1-24b-instruct:free', // Fallback 4 - Fast general
];

export interface OpenRouterChatParams {
  systemMessage: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
}

// Retry configuration
const MAX_RETRIES_PER_MODEL = 2;
const INITIAL_BACKOFF_MS = 1000;

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

// Helper to sleep for exponential backoff
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Strip markdown code blocks from response
const stripMarkdownCodeBlocks = (content: string): string => {
  let cleaned = content.trim();
  
  // Remove ```json ... ``` or ``` ... ``` blocks
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');
  
  // Also handle case where content might have multiple code blocks
  cleaned = cleaned.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1');
  
  return cleaned.trim();
};

// Extract JSON from potentially messy AI response
const extractJSON = (content: string): string => {
  let cleaned = stripMarkdownCodeBlocks(content);
  
  // Remove DeepSeek reasoning blocks
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  
  // Try to find JSON array or object
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  
  if (arrayMatch) {
    return arrayMatch[0];
  }
  if (objectMatch) {
    return objectMatch[0];
  }
  
  return cleaned;
};

// Make a single API call to a specific model
const callModel = async (
  model: string,
  params: OpenRouterChatParams,
  apiKey: string
): Promise<{ success: boolean; content?: string; error?: string; retryable: boolean }> => {
  const temperature = params.temperature ?? 0.4;
  const maxTokens = params.maxTokens ?? 1200;

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

      const lower = message.toLowerCase();
      const retryable =
        response.status === 429 ||  // Rate limit - retry with backoff or next model
        response.status >= 500 ||   // Server error - retry
        lower.includes('overloaded') ||
        lower.includes('unavailable') ||
        lower.includes('rate');
      
      const skipToNextModel =
        response.status === 404 ||  // Model not found
        response.status === 410 ||  // Model deprecated
        lower.includes('no endpoints');

      return {
        success: false,
        error: `${model}: ${message}`,
        retryable: retryable && !skipToNextModel
      };
    }

    let data: any = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      return {
        success: false,
        error: `${model}: Invalid JSON response from provider.`,
        retryable: true
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
        retryable: true
      };
    }

    // Clean up the content before returning
    const cleanedContent = extractJSON(content) || content;

    return {
      success: true,
      content: cleanedContent,
      retryable: false
    };
  } catch (err) {
    return {
      success: false,
      error: `${model}: ${err instanceof Error ? err.message : 'Network error'}`,
      retryable: true
    };
  }
};

export const callOpenRouterWithFallback = async (
  params: OpenRouterChatParams,
): Promise<string> => {
  const apiKey = await getOpenRouterApiKey();
  
  let lastError: string = 'All AI providers failed.';

  for (const model of OPENROUTER_MODELS) {
    console.log(`[OpenRouter] Trying model: ${model}`);
    
    // Retry loop for each model with exponential backoff
    for (let attempt = 0; attempt < MAX_RETRIES_PER_MODEL; attempt++) {
      if (attempt > 0) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        console.log(`[OpenRouter] Retry ${attempt} for ${model}, waiting ${backoffMs}ms`);
        await sleep(backoffMs);
      }

      const result = await callModel(model, params, apiKey);

      if (result.success && result.content) {
        console.log(`[OpenRouter] Success with model: ${model}`);
        return result.content;
      }

      lastError = result.error || 'Unknown error';
      console.warn(`[OpenRouter] ${result.error}`);

      // If not retryable (e.g., 404, 410, auth error), skip to next model
      if (!result.retryable) {
        break;
      }
    }
  }

  throw new Error(lastError);
};
