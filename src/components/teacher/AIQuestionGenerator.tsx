import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, Key, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
  onQuestionsGenerated: (questions: Question[]) => void;
}

const OPENROUTER_API_KEY_STORAGE = 'openrouter_api_key';

// Free models that work on OpenRouter
const FREE_MODELS = [
  { id: 'google/gemma-2-9b-it:free', name: 'Google Gemma 2 9B (Free)' },
  { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Llama 3.2 3B (Free)' },
  { id: 'qwen/qwen-2-7b-instruct:free', name: 'Qwen 2 7B (Free)' },
  { id: 'microsoft/phi-3-mini-128k-instruct:free', name: 'Microsoft Phi-3 Mini (Free)' },
  { id: 'huggingfaceh4/zephyr-7b-beta:free', name: 'Zephyr 7B (Free)' },
];

export const AIQuestionGenerator = ({
  selectedChapters,
  chapters,
  subjectName,
  onQuestionsGenerated
}: AIQuestionGeneratorProps) => {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isKeySet, setIsKeySet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(FREE_MODELS[0].id);
  
  // Question counts
  const [mcqCount, setMcqCount] = useState(5);
  const [blankCount, setBlankCount] = useState(5);
  const [shortCount, setShortCount] = useState(5);
  const [longCount, setLongCount] = useState(3);

  useEffect(() => {
    const savedKey = localStorage.getItem(OPENROUTER_API_KEY_STORAGE);
    if (savedKey) {
      setApiKey(savedKey);
      setIsKeySet(true);
    }
  }, []);

  const saveApiKey = () => {
    if (!apiKey.trim()) {
      toast({ title: 'Error', description: 'Please enter your OpenRouter API key', variant: 'destructive' });
      return;
    }
    localStorage.setItem(OPENROUTER_API_KEY_STORAGE, apiKey);
    setIsKeySet(true);
    toast({ title: 'Success', description: 'API key saved successfully!' });
  };

  const clearApiKey = () => {
    localStorage.removeItem(OPENROUTER_API_KEY_STORAGE);
    setApiKey('');
    setIsKeySet(false);
    toast({ title: 'Cleared', description: 'API key removed' });
  };

  const getSelectedChaptersContent = () => {
    const selected = chapters.filter(ch => selectedChapters.includes(ch.id));
    return selected.map(ch => `Chapter: ${ch.title}\nContent: ${ch.content}`).join('\n\n---\n\n');
  };

  const getSelectedChapterTitles = () => {
    const selected = chapters.filter(ch => selectedChapters.includes(ch.id));
    return selected.map(ch => ch.title).join(', ');
  };

  const generateQuestions = async () => {
    if (!isKeySet) {
      toast({ title: 'Error', description: 'Please set your OpenRouter API key first', variant: 'destructive' });
      return;
    }

    const chapterContent = getSelectedChaptersContent();
    const chapterTitles = getSelectedChapterTitles();
    
    if (!chapterContent.trim()) {
      toast({ title: 'Error', description: 'No chapter content available. Please select chapters with content.', variant: 'destructive' });
      return;
    }

    const totalQuestions = mcqCount + blankCount + shortCount + longCount;
    if (totalQuestions === 0) {
      toast({ title: 'Error', description: 'Please select at least one question to generate', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const prompt = `You are an expert teacher creating questions for a test.

SUBJECT: ${subjectName}
CHAPTER(S): ${chapterTitles}

CHAPTER CONTENT:
${chapterContent}

TASK: Generate questions ONLY from the above chapter content. Do not use external knowledge.

Generate exactly:
- ${mcqCount} Multiple Choice Questions (MCQ) with 4 options each
- ${blankCount} Fill in the Blank questions  
- ${shortCount} Short Answer questions
- ${longCount} Long Answer questions

Respond ONLY with a valid JSON array. Each question must follow this exact format:

For MCQ:
{"type": "mcq", "text": "Question text?", "options": ["Option A", "Option B", "Option C", "Option D"], "correctAnswer": "option0", "marks": 1}
Note: correctAnswer must be "option0", "option1", "option2", or "option3".

For Fill in the Blank:
{"type": "blank", "text": "The _____ is the answer.", "correctAnswer": "missing word", "marks": 1}

For Short Answer:
{"type": "short", "text": "What is...?", "marks": 2}

For Long Answer:
{"type": "long", "text": "Explain in detail...", "marks": 5}

Return ONLY the JSON array, no markdown code blocks, no explanation:`;

      const storedKey = localStorage.getItem(OPENROUTER_API_KEY_STORAGE) || apiKey;
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${storedKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Nexus Learn Test Creator',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No response from AI');
      }

      // Parse the JSON response
      let questions: any[];
      try {
        // Clean the response - remove markdown code blocks if present
        let cleanContent = content.trim();
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
      } catch (parseError) {
        console.error('Parse error:', parseError, 'Content:', content);
        throw new Error('Failed to parse AI response. Please try again.');
      }

      // Add IDs to questions
      const generatedQuestions: Question[] = questions.map((q: any, index: number) => ({
        id: `ai-${Date.now()}-${index}`,
        type: q.type,
        text: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        marks: q.marks || (q.type === 'mcq' || q.type === 'blank' ? 1 : q.type === 'short' ? 2 : 5)
      }));

      onQuestionsGenerated(generatedQuestions);
      toast({ 
        title: 'Questions Generated!', 
        description: `Successfully generated ${generatedQuestions.length} questions from "${chapterTitles}".` 
      });
      setOpen(false);

    } catch (error) {
      console.error('AI Generation Error:', error);
      toast({ 
        title: 'Generation Failed', 
        description: error instanceof Error ? error.message : 'Failed to generate questions', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const totalQuestions = mcqCount + blankCount + shortCount + longCount;

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
          {/* API Key Section */}
          <div className="space-y-2 sm:space-y-3">
            <Label className="flex items-center gap-2 text-sm">
              <Key className="h-4 w-4" />
              OpenRouter API Key
            </Label>
            {isKeySet ? (
              <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2">
                <div className="flex-1 flex items-center gap-2 p-2 bg-muted rounded-md">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-xs sm:text-sm">API key configured</span>
                </div>
                <Button variant="outline" size="sm" onClick={clearApiKey} className="shrink-0">
                  Change
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="sk-or-v1-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="text-sm"
                />
                <Button onClick={saveApiKey} size="sm" className="w-full">
                  Save API Key
                </Button>
                <p className="text-xs text-muted-foreground">
                  Get your free API key from{' '}
                  <a 
                    href="https://openrouter.ai/keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    openrouter.ai/keys
                  </a>
                </p>
              </div>
            )}
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <Label className="text-sm">AI Model</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {FREE_MODELS.map((model) => (
                  <SelectItem key={model.id} value={model.id} className="text-sm">
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          {/* Question Counts */}
          <div className="space-y-3 sm:space-y-4">
            <Label className="text-sm">Number of Questions by Type</Label>
            
            <div className="space-y-3 sm:space-y-4">
              {/* MCQ */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span>Multiple Choice (MCQ)</span>
                  <span className="font-medium">{mcqCount}</span>
                </div>
                <Slider
                  value={[mcqCount]}
                  onValueChange={(v) => setMcqCount(v[0])}
                  min={0}
                  max={20}
                  step={1}
                />
              </div>

              {/* Fill in the Blank */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span>Fill in the Blank</span>
                  <span className="font-medium">{blankCount}</span>
                </div>
                <Slider
                  value={[blankCount]}
                  onValueChange={(v) => setBlankCount(v[0])}
                  min={0}
                  max={20}
                  step={1}
                />
              </div>

              {/* Short Answer */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span>Short Answer</span>
                  <span className="font-medium">{shortCount}</span>
                </div>
                <Slider
                  value={[shortCount]}
                  onValueChange={(v) => setShortCount(v[0])}
                  min={0}
                  max={20}
                  step={1}
                />
              </div>

              {/* Long Answer */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span>Long Answer</span>
                  <span className="font-medium">{longCount}</span>
                </div>
                <Slider
                  value={[longCount]}
                  onValueChange={(v) => setLongCount(v[0])}
                  min={0}
                  max={20}
                  step={1}
                />
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex justify-between font-medium text-sm">
                <span>Total Questions</span>
                <span>{totalQuestions}</span>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <Button 
            onClick={generateQuestions} 
            disabled={loading || !isKeySet || selectedChapters.length === 0 || totalQuestions === 0}
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
                <span className="text-xs sm:text-sm">Generate {totalQuestions} Questions</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
