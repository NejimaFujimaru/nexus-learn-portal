import { useEffect, useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Loader2, Sparkles, AlertCircle, CheckCircle2, AlertTriangle, Brain, PartyPopper } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { database } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import { callOpenRouterWithFallback } from '@/lib/openrouter-helper';

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

// Small diamond star component
const DiamondStar = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    style={style}
  >
    <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
  </svg>
);

// Galaxy Animation Component - Central star with small diamond stars around it
const GalaxyAnimation = () => {
  return (
    <div className="relative w-full h-48 sm:h-56 bg-gradient-to-br from-primary/5 via-background to-primary/10 rounded-xl overflow-hidden border border-primary/20">
      {/* Rotating glow */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.4) 0%, transparent 50%)',
          animation: 'pulse 2s ease-in-out infinite',
        }}
      />
      
      {/* Small diamond stars around the central star */}
      <DiamondStar 
        className="absolute w-3 h-3 text-primary/60 animate-pulse"
        style={{ top: '20%', left: '25%', animationDelay: '0.2s' }}
      />
      <DiamondStar 
        className="absolute w-2 h-2 text-primary/40 animate-pulse"
        style={{ top: '30%', right: '22%', animationDelay: '0.5s' }}
      />
      <DiamondStar 
        className="absolute w-3 h-3 text-primary/50 animate-pulse"
        style={{ bottom: '25%', left: '20%', animationDelay: '0.8s' }}
      />
      <DiamondStar 
        className="absolute w-2.5 h-2.5 text-primary/55 animate-pulse"
        style={{ bottom: '22%', right: '25%', animationDelay: '0.3s' }}
      />
      <DiamondStar 
        className="absolute w-2 h-2 text-primary/45 animate-pulse"
        style={{ top: '18%', right: '35%', animationDelay: '0.6s' }}
      />
      <DiamondStar 
        className="absolute w-2 h-2 text-primary/35 animate-pulse"
        style={{ bottom: '35%', left: '30%', animationDelay: '1s' }}
      />
      
      {/* Center icon - the big central star */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <div 
            className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"
            style={{ width: 80, height: 80, margin: -16 }}
          />
          <Sparkles 
            className="w-12 h-12 text-primary animate-pulse" 
            style={{ filter: 'drop-shadow(0 0 12px hsl(var(--primary) / 0.6))' }}
          />
        </div>
      </div>
    </div>
  );
};

// Completion Animation Component - Clean, no extra decorative stars
const CompletionAnimation = ({ questionCount, totalMarks }: { questionCount: number; totalMarks: number }) => (
  <div className="w-full py-6 flex flex-col items-center justify-center space-y-4 animate-scale-in">
    <div className="relative">
      <div 
        className="absolute inset-0 bg-green-500/20 rounded-full blur-2xl animate-pulse"
        style={{ width: 120, height: 120, margin: -24 }}
      />
      <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center border-2 border-green-500">
        <CheckCircle2 className="w-10 h-10 text-green-500" />
      </div>
    </div>
    
    <div className="text-center space-y-2">
      <div className="flex items-center justify-center gap-2">
        <PartyPopper className="w-5 h-5 text-primary" />
        <h3 className="text-xl font-bold text-foreground">Generation Complete!</h3>
        <PartyPopper className="w-5 h-5 text-primary" />
      </div>
      <p className="text-muted-foreground">
        Successfully generated <span className="font-semibold text-primary">{questionCount} questions</span>
      </p>
      <p className="text-sm text-muted-foreground">
        Total marks: <span className="font-medium">{totalMarks}</span>
      </p>
    </div>
  </div>
);

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
  
  // View state: 'config' | 'generating' | 'complete'
  const [viewState, setViewState] = useState<'config' | 'generating' | 'complete'>('config');
  const [generatedResults, setGeneratedResults] = useState<{ count: number; marks: number } | null>(null);

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

  // Reset view when dialog closes
  useEffect(() => {
    if (!open) {
      setViewState('config');
      setGeneratedResults(null);
      setGenerationProgress(0);
      setGenerationStage('');
    }
  }, [open]);

  // Check if API key is configured in database
  useEffect(() => {
    const checkConfig = async () => {
      setConfigLoading(true);
      try {
        // Preferred new path
        const primaryRef = ref(database, 'config/openrouter/apiKey');
        const primarySnap = await get(primaryRef);
        let raw: unknown = primarySnap.exists() ? primarySnap.val() : '';
        let key = typeof raw === 'string' ? raw.trim() : '';

        // Backwards‑compat: also accept legacy config/openrouterKey
        if (!key) {
          const legacyRef = ref(database, 'config/openrouterKey');
          const legacySnap = await get(legacyRef);
          raw = legacySnap.exists() ? legacySnap.val() : '';
          key = typeof raw === 'string' ? raw.trim() : '';
        }

        setApiKeyConfigured(Boolean(key));
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
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'")
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

    let chapterContent = getSelectedChaptersContent();
    const chapterTitles = getSelectedChapterTitles();

    // Prevent OpenRouter "no endpoints found" by keeping prompts within provider limits
    const MAX_CHAPTER_CONTENT_CHARS = 20000;
    if (chapterContent.length > MAX_CHAPTER_CONTENT_CHARS) {
      chapterContent = `${chapterContent.slice(0, MAX_CHAPTER_CONTENT_CHARS)}\n\n[TRUNCATED: Content was too long for the model/providers. Reduce selected chapters or shorten chapter content for higher fidelity.]`;
    }

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

    // Transition to generating view
    setViewState('generating');
    setLoading(true);
    setGenerationProgress(0);
    setGenerationStage('');

    try {
      await simulateProgress(0, 18, 450, 'Preparing chapter content...');

      await simulateProgress(18, 28, 350, 'Reading AI configuration...');
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

      const systemMessage = 'You are a JSON generator. You must return ONLY a valid JSON array of questions. Do not include markdown, commentary, or any extra keys.';

      const content = await withProgress(
        (async () => {
          setStage('Contacting AI providers…', 38);
          return callOpenRouterWithFallback({
            systemMessage,
            userMessage: basePrompt,
            temperature: 0.4,
            maxTokens: 1200,
          });
        })(),
        { start: 35, end: 78, message: 'Generating questions with AI…', minMs: 1600 },
      );

      if (!content || !content.trim()) {
        throw new Error('No response from AI. Please try again.');
      }

      let parsed: any[];
      try {
        parsed = parseQuestionsFromModel(content);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error('No valid questions were generated.');
        }
      } catch (parseError) {
        console.error('Parse error:', parseError, 'Content:', content);
        throw new Error('Failed to parse AI response. Please try again.');
      }

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

      await simulateProgress(85, 100, 350, 'Finalizing questions...');

      // Store results and show completion
      const totalGeneratedMarks = generatedQuestions.reduce((sum, q) => sum + q.marks, 0);
      setGeneratedResults({ count: generatedQuestions.length, marks: totalGeneratedMarks });
      setViewState('complete');
      
      // Send questions to parent
      onQuestionsGenerated(generatedQuestions);
      
      toast({
        title: 'Questions Generated!',
        description: `Successfully generated ${generatedQuestions.length} questions (${totalGeneratedMarks} marks) from "${chapterTitles}".`,
      });
      
      // Auto-close after showing completion
      setTimeout(() => {
        setOpen(false);
      }, 2500);
      
    } catch (error) {
      console.error('AI Generation Error:', error);
      setViewState('config'); // Go back to config on error
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
        <Button 
          className="relative gap-2 w-full md:w-auto text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          style={{
            background: 'linear-gradient(45deg, #8B5CF6, #D946EF, #F97316)',
          }}
        >
          {/* White star on top left */}
          <svg 
            viewBox="0 0 24 24" 
            fill="white" 
            className="absolute -top-1 -left-1 w-4 h-4 drop-shadow"
          >
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
          </svg>
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
            {viewState === 'config' && 'Configure your question generation settings.'}
            {viewState === 'generating' && 'Generating questions using AI...'}
            {viewState === 'complete' && 'Questions have been generated successfully!'}
          </DialogDescription>
        </DialogHeader>

        {/* Config View */}
        <div 
          className={`transition-all duration-500 ease-out ${
            viewState === 'config' 
              ? 'opacity-100 translate-x-0' 
              : 'opacity-0 -translate-x-full absolute pointer-events-none'
          }`}
        >
          {viewState === 'config' && (
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
                    AI service not configured. Please add the API key to the database at <code className="bg-muted px-1 rounded">config/openrouter/apiKey</code> (or legacy <code className="bg-muted px-1 rounded">config/openrouterKey</code>)
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <span className="text-xs sm:text-sm font-medium flex items-center gap-1">
                        <Brain className="h-3 w-3 text-primary" /> Multiple Choice (MCQ)
                      </span>
                      <div className="text-xs text-muted-foreground">{mcqMarks} mark(s) each</div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Input
                        aria-label="MCQ marks per question"
                        type="number"
                        min={1}
                        max={20}
                        value={mcqMarks}
                        onChange={(e) => setMcqMarks(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                        className="w-14 sm:w-16 h-8 text-center text-xs sm:text-sm"
                      />
                      <Input
                        aria-label="MCQ question count"
                        type="number"
                        min={0}
                        max={20}
                        value={mcqCount}
                        onChange={(e) => handleCountChange(setMcqCount, e.target.value)}
                        className="w-14 sm:w-16 h-8 text-center text-xs sm:text-sm"
                      />
                      <span className="text-xs text-muted-foreground w-16 sm:w-20 text-right">= {mcqCount * mcqMarks} marks</span>
                    </div>
                  </div>

                  {/* Fill in the Blank */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <span className="text-xs sm:text-sm font-medium">Fill in the Blank</span>
                      <div className="text-xs text-muted-foreground">{blankMarks} mark(s) each</div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Input
                        aria-label="Blank marks per question"
                        type="number"
                        min={1}
                        max={20}
                        value={blankMarks}
                        onChange={(e) => setBlankMarks(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                        className="w-14 sm:w-16 h-8 text-center text-xs sm:text-sm"
                      />
                      <Input
                        aria-label="Blank question count"
                        type="number"
                        min={0}
                        max={20}
                        value={blankCount}
                        onChange={(e) => handleCountChange(setBlankCount, e.target.value)}
                        className="w-14 sm:w-16 h-8 text-center text-xs sm:text-sm"
                      />
                      <span className="text-xs text-muted-foreground w-16 sm:w-20 text-right">= {blankCount * blankMarks} marks</span>
                    </div>
                  </div>

                  {/* Short Answer */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <span className="text-xs sm:text-sm font-medium">Short Answer</span>
                      <div className="text-xs text-muted-foreground">{shortMarks} mark(s) each</div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Input
                        aria-label="Short answer marks per question"
                        type="number"
                        min={1}
                        max={20}
                        value={shortMarks}
                        onChange={(e) => setShortMarks(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                        className="w-14 sm:w-16 h-8 text-center text-xs sm:text-sm"
                      />
                      <Input
                        aria-label="Short answer question count"
                        type="number"
                        min={0}
                        max={20}
                        value={shortCount}
                        onChange={(e) => handleCountChange(setShortCount, e.target.value)}
                        className="w-14 sm:w-16 h-8 text-center text-xs sm:text-sm"
                      />
                      <span className="text-xs text-muted-foreground w-16 sm:w-20 text-right">= {shortCount * shortMarks} marks</span>
                    </div>
                  </div>

                  {/* Long Answer */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <span className="text-xs sm:text-sm font-medium">Long Answer</span>
                      <div className="text-xs text-muted-foreground">{longMarks} mark(s) each</div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Input
                        aria-label="Long answer marks per question"
                        type="number"
                        min={1}
                        max={20}
                        value={longMarks}
                        onChange={(e) => setLongMarks(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                        className="w-14 sm:w-16 h-8 text-center text-xs sm:text-sm"
                      />
                      <Input
                        aria-label="Long answer question count"
                        type="number"
                        min={0}
                        max={20}
                        value={longCount}
                        onChange={(e) => handleCountChange(setLongCount, e.target.value)}
                        className="w-14 sm:w-16 h-8 text-center text-xs sm:text-sm"
                      />
                      <span className="text-xs text-muted-foreground w-16 sm:w-20 text-right">= {longCount * longMarks} marks</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mark Calculation Summary */}
              <div className="p-3 sm:p-4 border rounded-lg space-y-2">
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

              {/* Generate Button */}
              <Button 
                onClick={generateQuestions} 
                disabled={loading || !apiKeyConfigured || selectedChapters.length === 0 || totalQuestions === 0 || marksExceed}
                className="w-full"
                size="sm"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                <span className="text-xs sm:text-sm">Generate {totalQuestions} Questions ({calculatedMarks} marks)</span>
              </Button>
            </div>
          )}
        </div>

        {/* Generating View */}
        <div 
          className={`transition-all duration-500 ease-out ${
            viewState === 'generating' 
              ? 'opacity-100 translate-x-0' 
              : viewState === 'complete'
                ? 'opacity-0 -translate-x-full absolute pointer-events-none'
                : 'opacity-0 translate-x-full absolute pointer-events-none'
          }`}
        >
          {viewState === 'generating' && (
            <div className="space-y-6 py-4">
              {/* Galaxy Animation - central star only */}
              <GalaxyAnimation />
              {/* Progress Bar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{generationStage || 'Initializing...'}</span>
                  <span className="font-medium text-primary">{generationProgress}%</span>
                </div>
                <Progress value={generationProgress} className="h-3" />
                <p className="text-xs text-center text-muted-foreground">
                  Generating {totalQuestions} questions • {calculatedMarks} total marks
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Complete View */}
        <div 
          className={`transition-all duration-500 ease-out ${
            viewState === 'complete' 
              ? 'opacity-100 scale-100' 
              : 'opacity-0 scale-95 absolute pointer-events-none'
          }`}
        >
          {viewState === 'complete' && generatedResults && (
            <CompletionAnimation 
              questionCount={generatedResults.count} 
              totalMarks={generatedResults.marks} 
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
