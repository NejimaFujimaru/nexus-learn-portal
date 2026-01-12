import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Loader2, Sparkles, AlertCircle, CheckCircle2, AlertTriangle, RefreshCw, Brain } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { database } from '@/lib/firebase';
import { ref, get } from 'firebase/database';

interface Question {
  id: string;
  type: 'mcq' | 'blank' | 'short' | 'long';
  text: string;
  options?: string[];
  correctAnswer?: string;
  marks: number;
}

interface Chapter {
  id: string;
  title: string;
  content: string;
}

interface AIQuestionGeneratorProps {
  selectedChapters: string[];
  chapters: Chapter[];
  subjectName: string;
  totalMarks: number;
  currentQuestionMarks: number;
  onQuestionsGenerated: (questions: Question[]) => void;
}

// Default marks per question type
const DEFAULT_MARKS = {
  mcq: 1,
  blank: 1,
  short: 2,
  long: 5
};

// Multi-model fallback sequence (all should be free-tier compatible on OpenRouter)
const MODEL_CHAIN = [
  'tngtech/deepseek-r1t2-chimera:free',
  'deepseek/deepseek-chat',
  'google/gemini-flash-1.5',
  'openai/gpt-4o-mini',
] as const;

type ModelId = (typeof MODEL_CHAIN)[number];

export const AIQuestionGenerator = ({
  selectedChapters,
  chapters,
  subjectName,
  totalMarks,
  currentQuestionMarks,
  onQuestionsGenerated
}: AIQuestionGeneratorProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);

  // UI progress
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState<string>('');
  const progressIntervalRef = useRef<number | null>(null);
  // Question counts
  const [mcqCount, setMcqCount] = useState(5);
  const [blankCount, setBlankCount] = useState(5);
  const [shortCount, setShortCount] = useState(3);
  const [longCount, setLongCount] = useState(2);

  // Marks per question type
  const [mcqMarks, setMcqMarks] = useState(DEFAULT_MARKS.mcq);
  const [blankMarks, setBlankMarks] = useState(DEFAULT_MARKS.blank);
  const [shortMarks, setShortMarks] = useState(DEFAULT_MARKS.short);
  const [longMarks, setLongMarks] = useState(DEFAULT_MARKS.long);

  // Check if API key is configured in database
  useEffect(() => {
    const checkConfig = async () => {
      setConfigLoading(true);
      try {
        const configRef = ref(database, 'config/openrouterKey');
        const snapshot = await get(configRef);
        setApiKeyConfigured(snapshot.exists() && snapshot.val()?.trim().length > 0);
      } catch (error) {
        console.error('Error checking API config:', error);
        setApiKeyConfigured(false);
      } finally {
        setConfigLoading(false);
      }
    };
    
    if (open) {
      checkConfig();
    }
  }, [open]);

  const getSelectedChaptersContent = () => {
    const selected = chapters.filter(ch => selectedChapters.includes(ch.id));
    return selected.map(ch => `Chapter: ${ch.title}\nContent: ${ch.content}`).join('\n\n---\n\n');
  };

  const getSelectedChapterTitles = () => {
    const selected = chapters.filter(ch => selectedChapters.includes(ch.id));
    return selected.map(ch => ch.title).join(', ');
  };

  // Calculate marks
  const calculatedMarks =
    (mcqCount * mcqMarks) +
    (blankCount * blankMarks) +
    (shortCount * shortMarks) +
    (longCount * longMarks);

  const availableMarks = totalMarks - currentQuestionMarks;
  const marksExceed = calculatedMarks > availableMarks;
  const totalQuestions = mcqCount + blankCount + shortCount + longCount;

  const setStage = (stage: string, progress: number) => {
    setGenerationStage(stage);
    setGenerationProgress((prev) => Math.max(prev, Math.min(100, progress)));
  };

  const clearProgressInterval = () => {
    if (progressIntervalRef.current !== null) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  // Progress animation like your sample: staged % increases + status messages
  const simulateProgress = (start: number, end: number, durationMs: number, message: string) => {
    return new Promise<void>((resolve) => {
      clearProgressInterval();
      setGenerationStage(message);

      const tickMs = 50;
      const steps = Math.max(1, Math.floor(durationMs / tickMs));
      const increment = (end - start) / steps;
      let current = start;

      setGenerationProgress(Math.max(0, Math.min(100, Math.floor(current))));

      progressIntervalRef.current = window.setInterval(() => {
        current += increment;

        if (current >= end) {
          current = end;
          clearProgressInterval();
          setGenerationProgress(Math.max(0, Math.min(100, Math.floor(current))));
          resolve();
          return;
        }

        setGenerationProgress(Math.max(0, Math.min(100, Math.floor(current))));
      }, tickMs);
    });
  };

  const withProgress = async <T,>(
    promise: Promise<T>,
    opts: { start: number; end: number; message: string; minMs?: number },
  ) => {
    clearProgressInterval();
    setGenerationStage(opts.message);
    setGenerationProgress((p) => Math.max(p, opts.start));

    const tickMs = 120;
    progressIntervalRef.current = window.setInterval(() => {
      setGenerationProgress((p) => {
        if (p >= opts.end - 1) return p;
        return p + 1;
      });
    }, tickMs);

    const startedAt = Date.now();

    try {
      const result = await promise;
      const minMs = opts.minMs ?? 900;
      const elapsed = Date.now() - startedAt;
      if (elapsed < minMs) {
        await new Promise((r) => setTimeout(r, minMs - elapsed));
      }
      return result;
    } finally {
      clearProgressInterval();
      setGenerationProgress((p) => Math.max(p, opts.end));
    }
  };

  const normalizeMcqCorrectAnswer = (raw: unknown): string | undefined => {
    if (raw === null || raw === undefined) return undefined;
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return `option${Math.max(0, Math.min(3, raw))}`;
    }
    if (typeof raw !== 'string') return undefined;

    const v = raw.trim();
    if (!v) return undefined;
    if (/^option[0-3]$/i.test(v)) return v.toLowerCase();

    const letter = v.toUpperCase();
    if (['A', 'B', 'C', 'D'].includes(letter)) {
      return `option${letter.charCodeAt(0) - 65}`;
    }

    return undefined;
  };

  const parseQuestionsFromModel = (rawContent: string): any[] => {
    let cleanContent = rawContent.trim();

    // Remove DeepSeek reasoning blocks if they appear
    cleanContent = cleanContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // Remove markdown code blocks
    cleanContent = cleanContent.replace(/^```(?:json)?\s*/i, '');
    cleanContent = cleanContent.replace(/\s*```$/i, '');
    cleanContent = cleanContent.trim();

    // Try to find the JSON array in the response (in case extra text slips in)
    // 1) Direct top-level array
    let jsonArrayMatch = cleanContent.match(/\[[\s\S]*\]/);

    // 2) Or nested under a "questions" property
    if (!jsonArrayMatch) {
      const questionsMatch = cleanContent.match(/"questions"\s*:\s*(\[[\s\S]*\])/i);
      if (questionsMatch) {
        jsonArrayMatch = [questionsMatch[1]] as unknown as RegExpMatchArray;
      }
    }

    if (jsonArrayMatch) {
      cleanContent = jsonArrayMatch[0];
    }

    const sanitize = (s: string) => {
      let result = s
        // Normalize various quote styles
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        // Remove obvious trailing commas
        .replace(/,\s*]/g, ']')
        .replace(/,\s*}/g, '}')
        // Normalize whitespace
        .replace(/\r/g, '')
        .replace(/\t/g, ' ')
        .replace(/\u00A0/g, ' ')
        .replace(/\n/g, ' ');

      // Collapse excessive spaces that models sometimes introduce in JSON
      result = result.replace(/\s{2,}/g, ' ');
      return result.trim();
    };

    const tryParse = (s: string) => {
      const parsed = JSON.parse(sanitize(s));
      if (!Array.isArray(parsed)) throw new Error('Response is not an array');
      return parsed;
    };

    try {
      return tryParse(cleanContent);
    } catch {
      // Fallback: tolerate single-quoted KEYS/VALUES (but avoid wrecking apostrophes inside words)
      const relaxed = cleanContent
        .replace(/([{,]\s*)'([^']+?)'\s*:/g, '$1"$2":')
        .replace(/:\s*'([^']*?)'(\s*[},])/g, ': "$1"$2');
      return tryParse(relaxed);
    }
  };

  const generateQuestions = async () => {
    if (!apiKeyConfigured) {
      toast({
        title: 'Configuration Error',
        description: 'OpenRouter API key is not configured in the database. Please contact your administrator.',
        variant: 'destructive',
      });
      return;
    }

    if (marksExceed) {
      toast({
        title: 'Marks Exceeded',
        description: `Generated questions would use ${calculatedMarks} marks, but only ${availableMarks} are available.`,
        variant: 'destructive',
      });
      return;
    }

    const chapterContent = getSelectedChaptersContent();
    const chapterTitles = getSelectedChapterTitles();

    if (!chapterContent.trim()) {
      toast({
        title: 'Error',
        description: 'No chapter content available. Please select chapters with content.',
        variant: 'destructive',
      });
      return;
    }

    if (totalQuestions === 0) {
      toast({ title: 'Error', description: 'Please set at least one question to generate', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setGenerationProgress(0);
    setGenerationStage('');

    try {
      await simulateProgress(0, 18, 450, 'Preparing chapter content...');

      // Fetch API key from database
      const apiKey = await withProgress(
        (async () => {
          try {
            const configRef = ref(database, 'config/openrouterKey');
            const snapshot = await get(configRef);
            const raw = snapshot.val();
            const key = typeof raw === 'string' ? raw.trim() : '';

            if (!key) {
              throw new Error('API key not found in database configuration (config/openrouterKey).');
            }
            return key;
          } catch (e: any) {
            // Firebase often throws a "permission_denied" error here
            const msg = typeof e?.message === 'string' ? e.message : '';
            if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
              throw new Error('Permission denied reading config/openrouterKey. Update your Firebase RTDB rules to allow teachers to read this path.');
            }
            throw e;
          }
        })(),
        { start: 18, end: 28, message: 'Reading API configuration...', minMs: 250 },
      );

      await simulateProgress(28, 35, 350, 'Building prompt...');

      const basePrompt = `You are an expert teacher creating questions for a test.

SUBJECT: ${subjectName}
CHAPTER(S): ${chapterTitles}

CHAPTER CONTENT:
${chapterContent}

TASK: Generate questions ONLY from the above chapter content. Do not use external knowledge.

Generate exactly:
${mcqCount > 0 ? `- ${mcqCount} Multiple Choice Questions (MCQ) with 4 options each, ${mcqMarks} mark(s) each` : ''}
${blankCount > 0 ? `- ${blankCount} Fill in the Blank questions, ${blankMarks} mark(s) each` : ''}
${shortCount > 0 ? `- ${shortCount} Short Answer questions, ${shortMarks} mark(s) each` : ''}
${longCount > 0 ? `- ${longCount} Long Answer questions, ${longMarks} mark(s) each` : ''}

IMPORTANT: Respond ONLY with a valid JSON array. No markdown, no code blocks, no explanation, no chain-of-thought, no reasoning tags.

Each question must follow this exact format:

For MCQ:
{"type": "mcq", "text": "Question text?", "options": ["Option A", "Option B", "Option C", "Option D"], "correctAnswer": "option0", "marks": ${mcqMarks}}
Note: correctAnswer must be "option0", "option1", "option2", or "option3" (index of correct option).

For Fill in the Blank:
{"type": "blank", "text": "The _____ is the answer.", "correctAnswer": "missing word", "marks": ${blankMarks}}

For Short Answer:
{"type": "short", "text": "What is...?", "marks": ${shortMarks}}

For Long Answer:
{"type": "long", "text": "Explain in detail...", "marks": ${longMarks}}

OUTPUT ONLY THE JSON ARRAY:`;

      const strictSystemPrompts: Record<number, string> = {
        0: 'You are a JSON generator. You must return ONLY a valid JSON array of questions. Do not include markdown, commentary, or any extra keys.',
        1: 'Return ONLY a JSON array. If you include anything else (markdown, prose, XML, etc.), the user application will break.',
        2: 'CRITICAL: Output must be a single JSON array. No code fences, no natural language, no reasoning.',
        3: 'FINAL ATTEMPT: Respond with a bare JSON array following the described question schema. Any other format is considered failure.',
      };

      const tryCallModel = async (model: ModelId, attemptIndex: number) => {
        const systemMessage = strictSystemPrompts[attemptIndex] ?? strictSystemPrompts[3];

        let response: Response | null = null;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
          try {
            response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${apiKey}`,
                Accept: 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Nexus Learn Test Creator',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model,
                messages: [
                  { role: 'system', content: systemMessage },
                  { role: 'user', content: basePrompt },
                ],
                temperature: 0.4,
                max_tokens: 3000,
              }),
            });

            if (response.ok) break;

            // Retry rate limit / server errors
            if (response.status === 429 || response.status >= 500) {
              retryCount++;
              if (retryCount < maxRetries) {
                setStage(`Model ${attemptIndex + 1}: rate limited, retrying...`, 40 + retryCount * 5);
                await new Promise((resolve) => setTimeout(resolve, 1500 * retryCount));
                continue;
              }
            }
            break;
          } catch (fetchError: any) {
            retryCount++;
            // Browser/CORS/network failures show up here as TypeError: Failed to fetch
            if (retryCount >= maxRetries) {
              const msg = typeof fetchError?.message === 'string' ? fetchError.message : '';
              if (msg.toLowerCase().includes('failed to fetch')) {
                throw new Error('Network/CORS error calling OpenRouter. If this persists, OpenRouter is blocking browser requests and we will need a server-side proxy.');
              }
              throw fetchError;
            }
            setStage(`Model ${attemptIndex + 1}: network issue, retrying...`, 40 + retryCount * 5);
            await new Promise((resolve) => setTimeout(resolve, 1500 * retryCount));
          }
        }

        if (!response || !response.ok) {
          let errorPayload: any = null;
          let rawText = '';

          if (response) {
            rawText = await response.text().catch(() => '');
            try {
              errorPayload = rawText ? JSON.parse(rawText) : null;
            } catch {
              errorPayload = null;
            }
          }

          const errorMessage =
            errorPayload?.error?.message ||
            (response?.status === 429
              ? 'Rate limited. Please wait a moment and try again.'
              : response?.status === 401
                ? 'Invalid API key. Please check the configuration.'
                : response?.status === 403
                  ? 'Forbidden. Check API key permissions and your OpenRouter account limits.'
                  : response?.status
                    ? `API Error: ${response.status}${rawText ? ` — ${rawText.slice(0, 160)}` : ''}`
                    : 'Network error');

          throw new Error(errorMessage);
        }

        return response.json();
      };

      // Call OpenRouter with multi-model fallback and parse per-model
      const parsed = await withProgress(
        (async () => {
          let lastError: any = null;

          for (let i = 0; i < MODEL_CHAIN.length; i++) {
            const model = MODEL_CHAIN[i];
            try {
              setStage(`Using AI model ${i + 1}/${MODEL_CHAIN.length}…`, 35 + i * 5);
              const data = await tryCallModel(model, i);

              const content =
                (data?.choices?.[0]?.message?.content as string | undefined) ||
                (typeof data?.choices?.[0]?.message === 'string'
                  ? (data.choices[0].message as string)
                  : undefined);

              if (!content || !content.trim()) {
                throw new Error('No response from AI. Please try again.');
              }

              try {
                const parsedForModel = parseQuestionsFromModel(content);
                if (!Array.isArray(parsedForModel) || parsedForModel.length === 0) {
                  throw new Error('No valid questions were generated.');
                }
                return parsedForModel;
              } catch (parseError) {
                console.error('Parse error for model', model, parseError, 'Content:', content);
                throw new Error('Failed to parse AI response.');
              }
            } catch (err) {
              console.warn(`Model ${model} failed`, err);
              lastError = err;
              if (i < MODEL_CHAIN.length - 1) {
                setStage('Retrying with backup AI model…', 45 + i * 5);
              }
            }
          }

          throw lastError || new Error('All AI models failed to generate questions. Please try again.');
        })(),
        { start: 35, end: 78, message: 'Generating questions with AI…', minMs: 1600 },
      );

      await simulateProgress(78, 85, 300, 'Parsing questions...');

      // Validate and normalize each question (be forgiving to reduce failures)
      const generatedQuestions: Question[] = [];
      for (let i = 0; i < parsed.length; i++) {
        const q = parsed[i];
        if (!q || typeof q !== 'object') continue;

        const rawType = typeof q.type === 'string' ? q.type.toLowerCase().trim() : '';
        const type: Question['type'] | undefined =
          rawType === 'mcq'
            ? 'mcq'
            : rawType === 'blank' || rawType === 'fillblank' || rawType === 'fill_blanks'
              ? 'blank'
              : rawType === 'short' || rawType === 'shortanswer'
                ? 'short'
                : rawType === 'long' || rawType === 'longanswer'
                  ? 'long'
                  : undefined;

        const text = (
          (typeof q.text === 'string' ? q.text : '') ||
          (typeof (q as any).question === 'string' ? (q as any).question : '') ||
          (typeof (q as any).sentence === 'string' ? (q as any).sentence : '')
        ).trim();

        if (!type || !text) continue;

        const marksVal =
          typeof q.marks === 'number'
            ? q.marks
            : typeof q.marks === 'string'
              ? parseInt(q.marks, 10)
              : NaN;

        const question: Question = {
          id: `ai-${Date.now()}-${i}`,
          type,
          text,
          marks: Number.isFinite(marksVal)
            ? marksVal
            : DEFAULT_MARKS[type as keyof typeof DEFAULT_MARKS] || 1,
        };

        if (type === 'mcq') {
          const rawOptions = Array.isArray(q.options) ? q.options : Array.isArray((q as any).choices) ? (q as any).choices : [];
          const options = rawOptions.map((o: any) => String(o).trim()).filter(Boolean);
          while (options.length < 4) options.push(`Option ${options.length + 1}`);
          question.options = options.slice(0, 4);

          const normalized = normalizeMcqCorrectAnswer((q as any).correctAnswer ?? (q as any).answer);
          question.correctAnswer = normalized ?? 'option0';
        }

        if (type === 'blank') {
          const ans = (q.correctAnswer ?? (q as any).answer) as any;
          question.correctAnswer = typeof ans === 'string' ? ans.trim() : ans !== undefined ? String(ans).trim() : '';
        }

        generatedQuestions.push(question);
      }

      if (generatedQuestions.length === 0) {
        throw new Error('No valid questions were generated. Please try again.');
      }

      await simulateProgress(85, 100, 350, 'Finalizing and formatting questions...');

      onQuestionsGenerated(generatedQuestions);
      toast({
        title: 'Questions Generated!',
        description: `Successfully generated ${generatedQuestions.length} questions (${generatedQuestions.reduce((sum, q) => sum + q.marks, 0)} marks) from "${chapterTitles}".`,
      });
      setOpen(false);
    } catch (error) {
      console.error('AI Generation Error:', error);
      toast({
        title: 'Generation Error',
        description: error instanceof Error ? error.message : 'Failed to generate questions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      clearProgressInterval();
      setLoading(false);
    }
  };

  const handleCountChange = (setter: (val: number) => void, value: string) => {
    const num = parseInt(value) || 0;
    setter(Math.max(0, Math.min(20, num)));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 w-full sm:w-auto">
          <Sparkles className="h-4 w-4" />
          <span className="hidden xs:inline">AI</span> Generate Questions
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Question Generator
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Generate questions automatically from your chapter content using AI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
          {/* API Configuration Status */}
          {configLoading ? (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Checking configuration...</span>
            </div>
          ) : apiKeyConfigured ? (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-700 dark:text-green-400">AI service configured and ready</span>
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs sm:text-sm">
                AI service not configured. Please add the API key to the database at <code className="bg-muted px-1 rounded">config/openrouterKey</code>
              </AlertDescription>
            </Alert>
          )}

          {/* Chapter Info */}
          {selectedChapters.length === 0 ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs sm:text-sm">
                Please select at least one chapter in Step 1 to generate questions.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertDescription className="text-xs sm:text-sm">
                Generating from <strong>{selectedChapters.length}</strong> chapter(s) in <strong>{subjectName}</strong>
                <div className="mt-1 text-muted-foreground text-xs">
                  {getSelectedChapterTitles()}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Question Counts with Number Inputs and Marks per Type */}
          <div className="space-y-3 sm:space-y-4">
            <Label className="text-sm font-medium">Question Types & Marks</Label>
            <p className="text-xs text-muted-foreground">
              Set how many questions you want for each type and how many marks each question should carry.
            </p>
            
            <div className="grid gap-3">
              {/* MCQ */}
              <div className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <span className="text-xs sm:text-sm font-medium flex items-center gap-1">
                    <Brain className="h-3 w-3 text-primary" /> Multiple Choice (MCQ)
                  </span>
                  <div className="text-xs text-muted-foreground">{mcqMarks} mark(s) each</div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    aria-label="MCQ marks per question"
                    type="number"
                    min={1}
                    max={20}
                    value={mcqMarks}
                    onChange={(e) => setMcqMarks(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                    className="w-16 h-8 text-center text-xs sm:text-sm"
                  />
                  <Input
                    aria-label="MCQ question count"
                    type="number"
                    min={0}
                    max={20}
                    value={mcqCount}
                    onChange={(e) => handleCountChange(setMcqCount, e.target.value)}
                    className="w-16 h-8 text-center text-xs sm:text-sm"
                  />
                  <span className="text-xs text-muted-foreground w-20 text-right">= {mcqCount * mcqMarks} marks</span>
                </div>
              </div>

              {/* Fill in the Blank */}
              <div className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <span className="text-xs sm:text-sm font-medium">Fill in the Blank</span>
                  <div className="text-xs text-muted-foreground">{blankMarks} mark(s) each</div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    aria-label="Blank marks per question"
                    type="number"
                    min={1}
                    max={20}
                    value={blankMarks}
                    onChange={(e) => setBlankMarks(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                    className="w-16 h-8 text-center text-xs sm:text-sm"
                  />
                  <Input
                    aria-label="Blank question count"
                    type="number"
                    min={0}
                    max={20}
                    value={blankCount}
                    onChange={(e) => handleCountChange(setBlankCount, e.target.value)}
                    className="w-16 h-8 text-center text-xs sm:text-sm"
                  />
                  <span className="text-xs text-muted-foreground w-20 text-right">= {blankCount * blankMarks} marks</span>
                </div>
              </div>

              {/* Short Answer */}
              <div className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <span className="text-xs sm:text-sm font-medium">Short Answer</span>
                  <div className="text-xs text-muted-foreground">{shortMarks} mark(s) each</div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    aria-label="Short answer marks per question"
                    type="number"
                    min={1}
                    max={20}
                    value={shortMarks}
                    onChange={(e) => setShortMarks(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                    className="w-16 h-8 text-center text-xs sm:text-sm"
                  />
                  <Input
                    aria-label="Short answer question count"
                    type="number"
                    min={0}
                    max={20}
                    value={shortCount}
                    onChange={(e) => handleCountChange(setShortCount, e.target.value)}
                    className="w-16 h-8 text-center text-xs sm:text-sm"
                  />
                  <span className="text-xs text-muted-foreground w-20 text-right">= {shortCount * shortMarks} marks</span>
                </div>
              </div>

              {/* Long Answer */}
              <div className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <span className="text-xs sm:text-sm font-medium">Long Answer</span>
                  <div className="text-xs text-muted-foreground">{longMarks} mark(s) each</div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    aria-label="Long answer marks per question"
                    type="number"
                    min={1}
                    max={20}
                    value={longMarks}
                    onChange={(e) => setLongMarks(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                    className="w-16 h-8 text-center text-xs sm:text-sm"
                  />
                  <Input
                    aria-label="Long answer question count"
                    type="number"
                    min={0}
                    max={20}
                    value={longCount}
                    onChange={(e) => handleCountChange(setLongCount, e.target.value)}
                    className="w-16 h-8 text-center text-xs sm:text-sm"
                  />
                  <span className="text-xs text-muted-foreground w-20 text-right">= {longCount * longMarks} marks</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mark Calculation Summary */}
          <div className="p-4 border rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total Questions:</span>
              <span className="font-medium">{totalQuestions}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Marks to Generate:</span>
              <span className={`font-medium ${marksExceed ? 'text-destructive' : 'text-green-600'}`}>
                {calculatedMarks}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Available Marks:</span>
              <span className="font-medium">{availableMarks} / {totalMarks}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span>After Generation:</span>
              <span className={`font-bold ${marksExceed ? 'text-destructive' : ''}`}>
                {currentQuestionMarks + calculatedMarks} / {totalMarks}
              </span>
            </div>
          </div>

          {/* Warning if marks exceed */}
          {marksExceed && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs sm:text-sm">
                <strong>Marks exceeded!</strong> Reduce the number of questions or their marks. 
                You need to remove {calculatedMarks - availableMarks} marks.
              </AlertDescription>
            </Alert>
          )}

          {/* Generation Progress */}
          {loading && (
            <div className="space-y-2 animate-fade-in">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{generationStage || 'Generating…'}</span>
                <span>{generationProgress}%</span>
              </div>
              <Progress value={generationProgress} className="h-2" />
            </div>
          )}

          {/* Generate Button */}
          <Button 
            onClick={generateQuestions} 
            disabled={loading || !apiKeyConfigured || selectedChapters.length === 0 || totalQuestions === 0 || marksExceed}
            className="w-full"
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="text-xs sm:text-sm">Generating {totalQuestions} Questions...</span>
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                <span className="text-xs sm:text-sm">Generate {totalQuestions} Questions ({calculatedMarks} marks)</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
