import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

const TestInterface = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [loading, setLoading] = useState(true);

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
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(prev => prev > 0 ? prev - 1 : 0), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!test) return;
    let mcqScore = 0, fillBlankScore = 0;
    const answerArray = Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer }));
    
    questions.forEach(q => {
      const studentAnswer = answers[q.id];
      if (q.type === 'mcq' && studentAnswer === q.correctAnswer) mcqScore += q.marks;
      if (q.type === 'fillBlank' && typeof studentAnswer === 'string' && 
          studentAnswer.toLowerCase().trim() === (q.correctAnswer as string).toLowerCase().trim()) 
        fillBlankScore += q.marks;
    });

    try {
      await dbOperations.addSubmission({
        testId: test.id,
        studentId: 'demo-student',
        studentName: 'Alex Thompson',
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

  const q = questions[currentQuestion];
  const progress = (Object.keys(answers).length / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 bg-card border-b border-border z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-foreground">{test.title}</h1>
          </div>
          <div className={cn("flex items-center gap-2 px-4 py-2 rounded-lg font-mono", 
            timeLeft < 300 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
            <Clock className="h-5 w-5" />{formatTime(timeLeft)}
          </div>
        </div>
        <Progress value={progress} className="h-1 rounded-none" />
      </header>

      <div className="pt-24 pb-24 px-4">
        <div className="max-w-3xl mx-auto">
          {q && (
            <Card className="bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{q.type.toUpperCase()}</Badge>
                  <span className="text-sm text-muted-foreground">Q {currentQuestion + 1} / {questions.length}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-lg font-medium text-foreground">{q.text}</p>
                
                {q.type === 'mcq' && q.options && (
                  <RadioGroup value={answers[q.id]?.toString()} onValueChange={(v) => setAnswers({...answers, [q.id]: parseInt(v)})}>
                    {q.options.map((opt, i) => (
                      <div key={i} className={cn("flex items-center space-x-3 p-4 rounded-lg border cursor-pointer",
                        answers[q.id] === i ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50")}>
                        <RadioGroupItem value={i.toString()} id={`opt-${i}`} />
                        <Label htmlFor={`opt-${i}`} className="cursor-pointer flex-1">{opt}</Label>
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

                <div className="flex justify-between pt-4 border-t">
                  <Button variant="outline" onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))} disabled={currentQuestion === 0}>
                    <ChevronLeft className="h-4 w-4 mr-1" />Previous
                  </Button>
                  {currentQuestion < questions.length - 1 ? (
                    <Button onClick={() => setCurrentQuestion(currentQuestion + 1)}>Next<ChevronRight className="h-4 w-4 ml-1" /></Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{Object.keys(answers).length} / {questions.length} answered</span>
          <Button onClick={handleSubmit} size="lg">Submit Test</Button>
        </div>
      </footer>
    </div>
  );
};

export default TestInterface;
