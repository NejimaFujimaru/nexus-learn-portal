export interface ParsedAiQuestionList {
  items: unknown[];
  truncated: boolean;
  json: string;
}

const stripWrappers = (raw: string) =>
  String(raw ?? '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

const findJsonCandidate = (raw: string): { json: string; truncated: boolean } => {
  const text = stripWrappers(raw);
  const starts = Array.from(text)
    .map((char, index) => ({ char, index }))
    .filter(({ char }) => char === '{' || char === '[');

  for (const { char, index } of starts) {
    const closeChar = char === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = index; i < text.length; i++) {
      const current = text[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (current === '\\' && inString) {
        escaped = true;
        continue;
      }

      if (current === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (current === char) depth += 1;
      if (current === closeChar) depth -= 1;

      if (depth === 0) {
        return { json: text.slice(index, i + 1), truncated: false };
      }
    }

    return { json: text.slice(index), truncated: true };
  }

  return { json: text, truncated: false };
};

const repairJson = (raw: string) =>
  raw
    .replace(/^\uFEFF/, '')
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/,\s*([}\]])/g, '$1')
    .trim();

const loosenJson = (raw: string) =>
  repairJson(raw)
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_-]*)\s*:/g, '$1"$2":')
    .replace(/([{,]\s*)'([^']+?)'\s*:/g, '$1"$2":')
    .replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'\s*([,}\]])/g, ': "$1"$2');

const parseValue = (json: string): unknown => {
  const candidates = [repairJson(json), loosenJson(json)];
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Could not parse AI JSON.');
};

const toQuestionArray = (value: unknown): unknown[] => {
  if (typeof value === 'string') {
    return toQuestionArray(parseValue(value));
  }

  if (Array.isArray(value)) return value;

  if (value && typeof value === 'object') {
    const obj = value as any;
    const arrays = [obj.questions, obj.items, obj.data, obj.results, obj.output?.questions];
    const match = arrays.find(Array.isArray);
    if (match) return match;

    if (typeof obj.type === 'string' || typeof obj.text === 'string' || typeof obj.question === 'string') {
      return [obj];
    }
  }

  throw new Error('AI response did not contain a questions array.');
};

export const parseAiQuestionList = (raw: string): ParsedAiQuestionList => {
  const candidate = findJsonCandidate(raw);

  if (candidate.truncated) {
    return { items: [], truncated: true, json: candidate.json };
  }

  const parsed = parseValue(candidate.json);
  return {
    items: toQuestionArray(parsed),
    truncated: false,
    json: candidate.json,
  };
};
