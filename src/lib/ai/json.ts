/**
 * Robust helpers for extracting + parsing JSON from LLM output.
 * Designed for cases where the model adds markdown, reasoning tags, or minor JSON mistakes.
 */

const stripCodeFences = (s: string) =>
  s
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1')
    .trim();

export const stripAiWrappers = (input: string) => {
  const cleaned = (input ?? '').toString();
  // Remove DeepSeek-style reasoning tags and common wrappers
  return stripCodeFences(cleaned).replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
};

const extractBalanced = (input: string, openChar: '[' | '{', closeChar: ']' | '}'): string | null => {
  const start = input.indexOf(openChar);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < input.length; i++) {
    const ch = input[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === '\\') {
      if (inString) escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === openChar) depth++;
    if (ch === closeChar) depth--;

    if (depth === 0 && i >= start) {
      return input.slice(start, i + 1);
    }
  }

  // Unbalanced (truncated) JSON
  return null;
};

export const extractLikelyJson = (input: string): { json: string; truncated: boolean } => {
  const s = (input ?? '').toString().trim();

  const array = extractBalanced(s, '[', ']');
  if (array) return { json: array, truncated: false };

  // If it *starts* an array but never closed, treat as truncated
  if (s.includes('[') && !s.includes(']')) {
    const start = s.indexOf('[');
    return { json: s.slice(start), truncated: true };
  }

  const obj = extractBalanced(s, '{', '}');
  if (obj) return { json: obj, truncated: false };

  if (s.includes('{') && !s.includes('}')) {
    const start = s.indexOf('{');
    return { json: s.slice(start), truncated: true };
  }

  return { json: s, truncated: false };
};

export const repairJsonLikeString = (input: string) => {
  let s = (input ?? '').toString();

  // Normalize curly quotes
  s = s
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/[\u2018\u2019\u2032]/g, "'");

  // Remove control chars that break JSON.parse
  s = s.replace(/[\x00-\x1F\x7F]/g, '');

  // Remove trailing commas
  s = s.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

  // Normalize whitespace
  s = s
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/\u00A0/g, ' ')
    .trim();

  return s;
};

const relaxSingleQuotes = (input: string) =>
  input
    // keys: {'a': 1} -> {"a": 1}
    .replace(/([{,]\s*)'([^']+?)'\s*:/g, '$1"$2":')
    // values: {a: 'b'} -> {a: "b"}
    .replace(/:\s*'([^']*?)'(\s*[},])/g, ': "$1"$2');

export const parseJsonArrayFromAi = (raw: string): { items: unknown[]; truncated: boolean } => {
  const stripped = stripAiWrappers(raw);
  const extracted = extractLikelyJson(stripped);
  const base = repairJsonLikeString(extracted.json);

  const coerceToArray = (parsed: unknown): unknown[] => {
    // Sometimes a provider returns JSON *as a string* (double-encoded)
    if (typeof parsed === 'string') {
      try {
        return coerceToArray(JSON.parse(parsed));
      } catch {
        // fall through
      }
    }

    if (Array.isArray(parsed)) return parsed;

    if (parsed && typeof parsed === 'object') {
      const obj: any = parsed;

      // Common shapes various models return
      const candidates = [
        obj.questions,
        obj.items,
        obj.data,
        obj.results,
        obj.output?.questions,
        obj.output?.items,
      ];
      for (const c of candidates) {
        if (Array.isArray(c)) return c;
      }

      // Some models accidentally return a single question object
      if (
        typeof obj.type === 'string' ||
        typeof obj.text === 'string' ||
        typeof obj.question === 'string'
      ) {
        return [obj];
      }
    }

    throw new Error('AI JSON was not an array');
  };

  const tryParse = (s: string): unknown[] => {
    const parsed = JSON.parse(s);
    return coerceToArray(parsed);
  };

  try {
    return { items: tryParse(base), truncated: extracted.truncated };
  } catch {
    const relaxed = repairJsonLikeString(relaxSingleQuotes(base));
    return { items: tryParse(relaxed), truncated: extracted.truncated };
  }
};
