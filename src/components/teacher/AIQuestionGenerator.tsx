import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Loader2, Sparkles, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
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

// Fixed model from database config
const FIXED_MODEL = 'tngtech/deepseek-r1t2-chimera:free';

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
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const generateQuestions = async () => {
    if (!apiKeyConfigured) {
      toast({ 
        title: 'Configuration Error', 
        description: 'OpenRouter API key is not configured in the database. Please contact your administrator.', 
        variant: 'destructive' 
      });
      return;
    }

    if (marksExceed) {
      toast({ 
        title: 'Marks Exceeded', 
        description: `Generated questions would use ${calculatedMarks} marks, but only ${availableMarks} are available.`, 
        variant: 'destructive' 
      });
      return;
    }

    const chapterContent = getSelectedChaptersContent();
    const chapterTitles = getSelectedChapterTitles();
    
    if (!chapterContent.trim()) {
      toast({ 
        title: 'Error', 
        description: 'No chapter content available. Please select chapters with content.', 
        variant: 'destructive' 
      });
      return;
    }

    if (totalQuestions === 0) {
      toast({ 
        title: 'Error', 
        description: 'Please set at least one question to generate', 
        variant: 'destructive' 
      });
      return;
    }

    setLoading(true);
    setGenerationProgress(0);
    setStage('Preparing generation…', 5);

    clearProgressInterval();
    // Smooth “working” animation while waiting for the network
    progressIntervalRef.current = window.setInterval(() => {
      setGenerationProgress((p) => {
        // drift slowly up to 55% while we wait
        if (p >= 55) return p;
        return p + 1;
      });
    }, 350);

    try {
      setStage('Reading API configuration…', 10);
      // Fetch API key from database
      const configRef = ref(database, 'config/openrouterKey');
      const snapshot = await get(configRef);
      const apiKey = typeof snapshot.val() === 'string' ? snapshot.val().trim() : snapshot.val();

      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        throw new Error('API key not found in database configuration (config/openrouterKey).');
      }

      setStage('Building prompt…', 18);

      const prompt = `You are an expert teacher creating questions for a test.

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

IMPORTANT: Respond ONLY with a valid JSON array. No markdown, no code blocks, no explanation, no thinking.

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

      setStage('Contacting AI…', 25);

      // Retry logic for API calls
      let response: Response | null = null;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          if (retryCount > 0) {
            setStage(`Retrying request… (${retryCount}/${maxRetries - 1})`, 25);
          }

          response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              Accept: 'application/json',
              'HTTP-Referer': window.location.origin,
              'X-Title': 'Nexus Learn Test Creator',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: FIXED_MODEL,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.7,
              max_tokens: 4000
            })
          });

          if (response.ok) break;

          // If rate limited or server error, retry after delay
          if (response.status === 429 || response.status >= 500) {
            retryCount++;
            if (retryCount < maxRetries) {
              await new Promise((resolve) => setTimeout(resolve, 1500 * retryCount));
              continue;
            }
          }
          break;
        } catch (fetchError) {
          retryCount++;
          if (retryCount >= maxRetries) throw fetchError;
          await new Promise((resolve) => setTimeout(resolve, 1500 * retryCount));
        }
      }

      setStage('Reading AI response…', 60);

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

        console.error('OpenRouter error:', {
          status: response?.status,
          statusText: response?.statusText,
          errorPayload,
          rawText
        });

        const errorMessage =
          errorPayload?.error?.message ||
          (response?.status === 429
            ? 'Rate limited. Please wait a moment and try again.'
            : response?.status === 401
              ? 'Invalid API key. Please check the configuration.'
              : response?.status === 403
                ? 'Forbidden. Check API key permissions and your OpenRouter account limits.'
                : response?.status
                  ? `API Error: ${response.status}`
                  : 'Network error');

        throw new Error(errorMessage);
      }

      setStage('Receiving response…', 60);

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No response from AI. Please try again.');
      }

      setStage('Parsing questions…', 75);

      // Robust JSON parsing
      let questions: any[];
      try {
        let cleanContent = content.trim();
        
        // Remove <think>...</think> tags if present (DeepSeek reasoning)
        cleanContent = cleanContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        
        // Remove markdown code blocks
        cleanContent = cleanContent.replace(/^```(?:json)?\s*/i, '');
        cleanContent = cleanContent.replace(/\s*```$/i, '');
        cleanContent = cleanContent.trim();
        
        // Try to find JSON array in the response
        const jsonArrayMatch = cleanContent.match(/\[[\s\S]*\]/);
        if (jsonArrayMatch) {
          cleanContent = jsonArrayMatch[0];
        }
        
        // Fix common JSON issues
        cleanContent = cleanContent
          .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
          .replace(/,\s*}/g, '}') // Remove trailing commas in objects
          .replace(/'/g, '"') // Replace single quotes with double quotes
          .replace(/\n/g, ' ') // Remove newlines
          .replace(/\r/g, '') // Remove carriage returns
          .replace(/\t/g, ' '); // Remove tabs
        
        questions = JSON.parse(cleanContent);
        
        if (!Array.isArray(questions)) {
          throw new Error('Response is not an array');
        }
      } catch (parseError) {
        console.error('Parse error:', parseError, 'Content:', content);
        throw new Error('Failed to parse AI response. The AI returned an invalid format. Please try again.');
      }

      // Validate and normalize each question
      const validTypes = ['mcq', 'blank', 'short', 'long'];
      const generatedQuestions: Question[] = [];
      
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        
        // Skip invalid questions
        if (!q || typeof q !== 'object') continue;
        if (!q.text || typeof q.text !== 'string') continue;
        if (!q.type || !validTypes.includes(q.type)) continue;
        
        const question: Question = {
          id: `ai-${Date.now()}-${i}`,
          type: q.type,
          text: q.text.trim(),
          marks: typeof q.marks === 'number' ? q.marks : DEFAULT_MARKS[q.type as keyof typeof DEFAULT_MARKS] || 1
        };
        
        // Add options for MCQ
        if (q.type === 'mcq') {
          if (Array.isArray(q.options) && q.options.length >= 2) {
            question.options = q.options.map((opt: any) => String(opt).trim()).filter(Boolean);
            // Ensure we have at least 4 options
            while (question.options.length < 4) {
              question.options.push(`Option ${question.options.length + 1}`);
            }
          } else {
            question.options = ['Option A', 'Option B', 'Option C', 'Option D'];
          }
          question.correctAnswer = q.correctAnswer || 'option0';
        }
        
        // Add correct answer for fill in the blank
        if (q.type === 'blank') {
          question.correctAnswer = q.correctAnswer ? String(q.correctAnswer).trim() : '';
        }
        
        generatedQuestions.push(question);
      }

      if (generatedQuestions.length === 0) {
        throw new Error('No valid questions were generated. Please try again.');
      }

      setStage('Finalizing…', 95);
      clearProgressInterval();
      setGenerationProgress(100);

      onQuestionsGenerated(generatedQuestions);
      toast({ 
        title: 'Questions Generated!', 
        description: `Successfully generated ${generatedQuestions.length} questions (${generatedQuestions.reduce((sum, q) => sum + q.marks, 0)} marks) from "${chapterTitles}".` 
      });
      setOpen(false);

    } catch (error) {
      console.error('AI Generation Error:', error);
      clearProgressInterval();
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate questions. Please try again.',
        variant: 'destructive'
      });
    } finally {
      clearProgressInterval();
      setLoading(false);
      // Keep the last progress value visible until dialog closes
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

          {/* Question Counts with Number Inputs */}
          <div className="space-y-3 sm:space-y-4">
            <Label className="text-sm font-medium">Number of Questions by Type</Label>
            
            <div className="grid gap-3">
              {/* MCQ */}
              <div className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <span className="text-xs sm:text-sm font-medium">Multiple Choice (MCQ)</span>
                  <div className="text-xs text-muted-foreground">{mcqMarks} mark each</div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={mcqCount}
                    onChange={(e) => handleCountChange(setMcqCount, e.target.value)}
                    className="w-16 h-8 text-center text-sm"
                  />
                  <span className="text-xs text-muted-foreground w-16">= {mcqCount * mcqMarks} marks</span>
                </div>
              </div>

              {/* Fill in the Blank */}
              <div className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <span className="text-xs sm:text-sm font-medium">Fill in the Blank</span>
                  <div className="text-xs text-muted-foreground">{blankMarks} mark each</div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={blankCount}
                    onChange={(e) => handleCountChange(setBlankCount, e.target.value)}
                    className="w-16 h-8 text-center text-sm"
                  />
                  <span className="text-xs text-muted-foreground w-16">= {blankCount * blankMarks} marks</span>
                </div>
              </div>

              {/* Short Answer */}
              <div className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <span className="text-xs sm:text-sm font-medium">Short Answer</span>
                  <div className="text-xs text-muted-foreground">{shortMarks} marks each</div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={shortCount}
                    onChange={(e) => handleCountChange(setShortCount, e.target.value)}
                    className="w-16 h-8 text-center text-sm"
                  />
                  <span className="text-xs text-muted-foreground w-16">= {shortCount * shortMarks} marks</span>
                </div>
              </div>

              {/* Long Answer */}
              <div className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <span className="text-xs sm:text-sm font-medium">Long Answer</span>
                  <div className="text-xs text-muted-foreground">{longMarks} marks each</div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={longCount}
                    onChange={(e) => handleCountChange(setLongCount, e.target.value)}
                    className="w-16 h-8 text-center text-sm"
                  />
                  <span className="text-xs text-muted-foreground w-16">= {longCount * longMarks} marks</span>
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
