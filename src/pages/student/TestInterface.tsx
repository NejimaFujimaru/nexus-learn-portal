import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Clock, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { dbOperations, Test, Question } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { callOpenRouterWithFallback } from '@/lib/openrouter-helper';

const TestInterface = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPractice = searchParams.get('practice') === 'true';
  const { user } = useAuth();
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);

  useEffect(() => {
    const loadTest = async () => {
      const tests = await dbOperations.getTests();
      const found = tests.find(t => t.id === testId);
      if (found) {
        setTest(found);
        setTimeLeft(found.duration * 60);
        const qs = await dbOperations.getQuestionsByTest(found.id);
        setQuestions(qs);
      }
      setLoading(false);
    };
    loadTest();
  }, [testId]);

  useEffect(() => {
    if (timeLeft <= 0 || loading || !test) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Auto-submit when time runs out
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, loading, test]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate similarity between two strings (0-1)
  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;
    
    // Levenshtein distance
    const matrix: number[][] = [];
    for (let i = 0; i <= s1.length; i++) matrix[i] = [i];
    for (let j = 0; j <= s2.length; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    
    const maxLen = Math.max(s1.length, s2.length);
    return 1 - matrix[s1.length][s2.length] / maxLen;
  };

  const normalizeMcqIndex = (
    correctAnswer: Question["correctAnswer"],
    options?: string[]
  ): number | null => {
    if (typeof correctAnswer === 'number' && Number.isFinite(correctAnswer)) return correctAnswer;
    if (typeof correctAnswer !== 'string') return null;

    const v = correctAnswer.trim();

    // Stored by TestCreationWizard as "option0", "option1", ...
    const optionMatch = /^option(\d+)$/.exec(v);
    if (optionMatch) return Number(optionMatch[1]);

    // Stored as numeric string
    const n = Number(v);
    if (Number.isFinite(n)) return n;

    // Stored as option text
    if (options?.length) {
      const idx = options.findIndex(
        (o) => o?.trim().toLowerCase() === v.toLowerCase()
      );
      if (idx >= 0) return idx;
    }

    return null;
  };

  const handleSubmit = async () => {
    if (!test) return;
    let mcqScore = 0, fillBlankScore = 0;
    const answerArray = Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer }));

    questions.forEach(q => {
      const studentAnswer = answers[q.id];

      // MCQ: compare indices, supporting stored values like "option2" as well as numbers
      if (q.type === 'mcq' && studentAnswer !== undefined) {
        const studentIndex = typeof studentAnswer === 'string' ? Number(studentAnswer) : studentAnswer;
        const correctIndex = normalizeMcqIndex(q.correctAnswer, q.options);

        if (Number.isFinite(studentIndex) && correctIndex !== null && studentIndex === correctIndex) {
          mcqScore += q.marks;
        }
      }

      // Fill in blank: 65% similarity threshold
      if (q.type === 'fillBlank' && typeof studentAnswer === 'string' && q.correctAnswer) {
        const similarity = calculateSimilarity(studentAnswer, String(q.correctAnswer));
        if (similarity >= 0.65) fillBlankScore += q.marks;
      }
    });

    try {
      await dbOperations.addSubmission({
        testId: test.id,
        studentId: user?.uid || 'unknown',
        studentName: user?.displayName || user?.email?.split('@')[0] || 'Student',
        answers: answerArray,
        mcqScore, fillBlankScore,
        totalAutoScore: mcqScore + fillBlankScore,
        status: 'pending'
      });
      toast({ title: "Test submitted successfully!" });
      navigate(`/student/test/${testId}/submitted`);
    } catch (error) {
      toast({ title: "Error submitting test", variant: "destructive" });
    }
  };

  if (loading || !test) return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">No questions found for this test.</p>
            <Button onClick={() => navigate('/student/dashboard')}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const q = questions[currentQuestion];
  const progress = (Object.keys(answers).length / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 bg-card border-b border-border z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="font-semibold text-foreground text-sm sm:text-base truncate">{test.title}</h1>
          </div>
          <div className={cn("flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-mono text-sm sm:text-base flex-shrink-0", 
            timeLeft < 300 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
            <Clock className="h-4 w-4 sm:h-5 sm:w-5" />{formatTime(timeLeft)}
          </div>
        </div>
        <Progress value={progress} className="h-1 rounded-none" />
      </header>

      <div className="pt-20 sm:pt-24 pb-20 sm:pb-24 px-3 sm:px-4">
        <div className="max-w-3xl mx-auto">
          {q && (
            <Card className="bg-card">
              <CardHeader className="p-3 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary" className="text-xs">{q.type.toUpperCase()}</Badge>
                  <span className="text-xs sm:text-sm text-muted-foreground">Q {currentQuestion + 1} / {questions.length}</span>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0 space-y-4 sm:space-y-6">
                <p className="text-base sm:text-lg font-medium text-foreground">{q.text}</p>
                
                {q.type === 'mcq' && q.options && (
                  <RadioGroup value={answers[q.id]?.toString()} onValueChange={(v) => setAnswers({...answers, [q.id]: parseInt(v)})}>
                    {q.options.map((opt, i) => (
                      <div key={i} className={cn("flex items-center space-x-2 sm:space-x-3 p-3 sm:p-4 rounded-lg border cursor-pointer",
                        answers[q.id] === i ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50")}>
                        <RadioGroupItem value={i.toString()} id={`opt-${i}`} />
                        <Label htmlFor={`opt-${i}`} className="cursor-pointer flex-1 text-sm sm:text-base">{opt}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
                
                {q.type === 'fillBlank' && (
                  <Input placeholder="Your answer..." value={answers[q.id] as string || ''} 
                    onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})} />
                )}
                
                {q.type === 'shortAnswer' && (
                  <Textarea placeholder="Write your answer..." rows={5} value={answers[q.id] as string || ''} 
                    onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})} />
                )}

                {q.type === 'longAnswer' && (
                  <Textarea placeholder="Write your detailed answer..." rows={10} value={answers[q.id] as string || ''} 
                    onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})} />
                )}

                <div className="flex justify-between pt-3 sm:pt-4 border-t gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))} disabled={currentQuestion === 0}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">Prev</span>
                  </Button>
                  {currentQuestion < questions.length - 1 ? (
                    <Button size="sm" onClick={() => setCurrentQuestion(currentQuestion + 1)}>Next<ChevronRight className="h-4 w-4 ml-1" /></Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2">
          <span className="text-xs sm:text-sm text-muted-foreground">{Object.keys(answers).length} / {questions.length} answered</span>
          <Button onClick={handleSubmit} size="sm" className="text-sm">Submit Test</Button>
        </div>
      </footer>
    </div>
  );
};

export default TestInterface;
