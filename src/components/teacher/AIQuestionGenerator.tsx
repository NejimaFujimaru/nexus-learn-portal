import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

// Models to try in order (fallback chain for reliability)
const MODELS = [
  'google/gemma-2-9b-it:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'qwen/qwen-2-7b-instruct:free'
];

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

    try {
      // Fetch API key from database
      const configRef = ref(database, 'config/openrouterKey');
      const snapshot = await get(configRef);
      const apiKey = snapshot.val();
      
      if (!apiKey) {
        throw new Error('API key not found in database configuration');
      }

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

Respond ONLY with a valid JSON array. Each question must follow this exact format:

For MCQ:
{"type": "mcq", "text": "Question text?", "options": ["Option A", "Option B", "Option C", "Option D"], "correctAnswer": "option0", "marks": ${mcqMarks}}
Note: correctAnswer must be "option0", "option1", "option2", or "option3" (index of correct option).

For Fill in the Blank:
{"type": "blank", "text": "The _____ is the answer.", "correctAnswer": "missing word", "marks": ${blankMarks}}

For Short Answer:
{"type": "short", "text": "What is...?", "marks": ${shortMarks}}

For Long Answer:
{"type": "long", "text": "Explain in detail...", "marks": ${longMarks}}

Return ONLY the JSON array, no markdown code blocks, no explanation, no thinking process:`;

      let lastError: Error | null = null;
      let questions: any[] | null = null;

      // Try each model with retries
      for (const model of MODELS) {
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            console.log(`Trying model: ${model}, attempt ${attempt}/${MAX_RETRIES}`);
            
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Nexus Learn Test Creator',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: model,
                messages: [
                  { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 4000
              })
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              console.warn(`API Error (${model}, attempt ${attempt}):`, errorData);
              lastError = new Error(errorData.error?.message || `API Error: ${response.status}`);
              
              // If rate limited or server error, wait before retry
              if (response.status === 429 || response.status >= 500) {
                await sleep(RETRY_DELAY * attempt);
              }
              continue;
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;

            if (!content || content.trim().length === 0) {
              console.warn(`Empty response from ${model}, attempt ${attempt}`);
              lastError = new Error('Empty response from AI');
              await sleep(RETRY_DELAY);
              continue;
            }

            // Parse the JSON response
            try {
              let cleanContent = content.trim();
              
              // Remove <think>...</think> tags if present
              cleanContent = cleanContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
              
              if (cleanContent.startsWith('```json')) {
                cleanContent = cleanContent.slice(7);
              } else if (cleanContent.startsWith('```')) {
                cleanContent = cleanContent.slice(3);
              }
              if (cleanContent.endsWith('```')) {
                cleanContent = cleanContent.slice(0, -3);
              }
              cleanContent = cleanContent.trim();
              
              // Try to extract JSON from the response
              const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
              if (jsonMatch) {
                questions = JSON.parse(jsonMatch[0]);
              } else {
                questions = JSON.parse(cleanContent);
              }
              
              // Validate we got an array
              if (!Array.isArray(questions) || questions.length === 0) {
                throw new Error('Invalid response format');
              }
              
              // Success! Break out of retry loop
              console.log(`Success with ${model} on attempt ${attempt}`);
              break;
            } catch (parseError) {
              console.warn(`Parse error (${model}, attempt ${attempt}):`, parseError);
              lastError = new Error('Failed to parse AI response');
              await sleep(RETRY_DELAY);
              continue;
            }
          } catch (fetchError) {
            console.warn(`Fetch error (${model}, attempt ${attempt}):`, fetchError);
            lastError = fetchError instanceof Error ? fetchError : new Error('Network error');
            await sleep(RETRY_DELAY);
            continue;
          }
        }
        
        // If we got questions, break out of model loop
        if (questions && questions.length > 0) {
          break;
        }
      }

      // If no questions were generated after all retries
      if (!questions || questions.length === 0) {
        throw lastError || new Error('Failed to generate questions after multiple attempts');
      }

      // Add IDs and validate marks
      const generatedQuestions: Question[] = questions.map((q: any, index: number) => ({
        id: `ai-${Date.now()}-${index}`,
        type: q.type,
        text: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        marks: q.marks || DEFAULT_MARKS[q.type as keyof typeof DEFAULT_MARKS] || 1
      }));

      onQuestionsGenerated(generatedQuestions);
      toast({ 
        title: 'Questions Generated!', 
        description: `Successfully generated ${generatedQuestions.length} questions (${calculatedMarks} marks) from "${chapterTitles}".` 
      });
      setOpen(false);

    } catch (error) {
      console.error('AI Generation Error:', error);
      toast({ 
        title: 'Generation Failed', 
        description: error instanceof Error ? error.message : 'Failed to generate questions. Please try again.', 
        variant: 'destructive' 
      });
    } finally {
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
