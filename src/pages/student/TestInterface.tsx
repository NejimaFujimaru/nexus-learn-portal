import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockTests, mockQuestions } from '@/data/mockData';
import { Clock, Save, ChevronLeft, ChevronRight, CheckCircle, Circle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type SectionType = 'mcq' | 'fillBlanks' | 'shortAnswer';

const TestInterface = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const test = mockTests.find((t) => t.id === testId);
  
  const [currentSection, setCurrentSection] = useState<SectionType>('mcq');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(test?.duration ? test.duration * 60 : 2700);
  const [autoSaved, setAutoSaved] = useState(false);
  
  // Mock answers state
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, number>>({});
  const [fillAnswers, setFillAnswers] = useState<Record<string, string>>({});
  const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({});

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-save indicator
  useEffect(() => {
    const saveInterval = setInterval(() => {
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 2000);
    }, 30000);
    return () => clearInterval(saveInterval);
  }, []);

  if (!test) {
    navigate('/student/dashboard');
    return null;
  }

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const sections: { key: SectionType; label: string; count: number }[] = [
    { key: 'mcq', label: 'MCQ', count: mockQuestions.mcq.length },
    { key: 'fillBlanks', label: 'Fill in the Blanks', count: mockQuestions.fillBlanks.length },
    { key: 'shortAnswer', label: 'Short Answer', count: mockQuestions.shortAnswer.length },
  ];

  const getCurrentQuestions = () => {
    switch (currentSection) {
      case 'mcq': return mockQuestions.mcq;
      case 'fillBlanks': return mockQuestions.fillBlanks;
      case 'shortAnswer': return mockQuestions.shortAnswer;
    }
  };

  const questions = getCurrentQuestions();
  const totalQuestions = mockQuestions.mcq.length + mockQuestions.fillBlanks.length + mockQuestions.shortAnswer.length;
  const answeredCount = Object.keys(mcqAnswers).length + Object.keys(fillAnswers).length + Object.keys(shortAnswers).length;
  const progress = (answeredCount / totalQuestions) * 100;

  const isQuestionAnswered = (index: number) => {
    const q = questions[index];
    if (currentSection === 'mcq') return mcqAnswers[q.id] !== undefined;
    if (currentSection === 'fillBlanks') return !!fillAnswers[q.id];
    return !!shortAnswers[q.id];
  };

  const handleSubmit = () => {
    navigate(`/student/test/${testId}/submitted`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 bg-card border-b border-border z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-foreground text-lg line-clamp-1">{test.name}</h1>
            <p className="text-sm text-muted-foreground">{test.subject}</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Auto-save indicator */}
            {autoSaved && (
              <div className="flex items-center gap-1 text-sm text-chart-1 animate-pulse">
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">Auto-saved</span>
              </div>
            )}
            {/* Timer */}
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg",
              timeLeft < 300 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
            )}>
              <Clock className="h-5 w-5" />
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <Progress value={progress} className="h-1 rounded-none" />
      </header>

      {/* Main Content */}
      <div className="pt-24 pb-24 px-4">
        <div className="max-w-7xl mx-auto flex gap-6">
          {/* Question Navigator Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <Card className="bg-card sticky top-28">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sections.map((section) => (
                  <div key={section.key}>
                    <Button
                      variant={currentSection === section.key ? "default" : "ghost"}
                      size="sm"
                      className="w-full justify-start mb-2"
                      onClick={() => {
                        setCurrentSection(section.key);
                        setCurrentQuestion(0);
                      }}
                    >
                      {section.label}
                    </Button>
                    {currentSection === section.key && (
                      <div className="grid grid-cols-5 gap-2">
                        {Array.from({ length: section.count }).map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentQuestion(i)}
                            className={cn(
                              "w-8 h-8 rounded-md text-sm font-medium flex items-center justify-center transition-colors",
                              currentQuestion === i
                                ? "bg-primary text-primary-foreground"
                                : isQuestionAnswered(i)
                                ? "bg-chart-1/20 text-chart-1"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            )}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                <div className="pt-4 border-t border-border space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-chart-1/20" />
                    <span className="text-muted-foreground">Answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-muted" />
                    <span className="text-muted-foreground">Unanswered</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Question Area */}
          <main className="flex-1 max-w-3xl">
            {/* Section Tabs (Mobile) */}
            <div className="lg:hidden flex gap-2 mb-4 overflow-x-auto pb-2">
              {sections.map((section) => (
                <Badge
                  key={section.key}
                  variant={currentSection === section.key ? "default" : "outline"}
                  className="cursor-pointer whitespace-nowrap"
                  onClick={() => {
                    setCurrentSection(section.key);
                    setCurrentQuestion(0);
                  }}
                >
                  {section.label} ({section.count})
                </Badge>
              ))}
            </div>

            <Card className="bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {sections.find(s => s.key === currentSection)?.label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Question {currentQuestion + 1} of {questions.length}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentSection === 'mcq' && (
                  <div className="space-y-6">
                    <p className="text-lg font-medium text-foreground">
                      {mockQuestions.mcq[currentQuestion].question}
                    </p>
                    <RadioGroup
                      value={mcqAnswers[mockQuestions.mcq[currentQuestion].id]?.toString()}
                      onValueChange={(value) => {
                        setMcqAnswers(prev => ({
                          ...prev,
                          [mockQuestions.mcq[currentQuestion].id]: parseInt(value)
                        }));
                      }}
                    >
                      {mockQuestions.mcq[currentQuestion].options.map((option, index) => (
                        <div
                          key={index}
                          className={cn(
                            "flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer",
                            mcqAnswers[mockQuestions.mcq[currentQuestion].id] === index
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted/50"
                          )}
                        >
                          <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                          <Label htmlFor={`option-${index}`} className="cursor-pointer flex-1">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                {currentSection === 'fillBlanks' && (
                  <div className="space-y-6">
                    <p className="text-lg font-medium text-foreground">
                      {mockQuestions.fillBlanks[currentQuestion].question}
                    </p>
                    <Input
                      placeholder="Type your answer here..."
                      value={fillAnswers[mockQuestions.fillBlanks[currentQuestion].id] || ''}
                      onChange={(e) => {
                        setFillAnswers(prev => ({
                          ...prev,
                          [mockQuestions.fillBlanks[currentQuestion].id]: e.target.value
                        }));
                      }}
                      className="text-lg"
                    />
                  </div>
                )}

                {currentSection === 'shortAnswer' && (
                  <div className="space-y-6">
                    <p className="text-lg font-medium text-foreground">
                      {mockQuestions.shortAnswer[currentQuestion].question}
                    </p>
                    <Textarea
                      placeholder="Write your answer here..."
                      value={shortAnswers[mockQuestions.shortAnswer[currentQuestion].id] || ''}
                      onChange={(e) => {
                        setShortAnswers(prev => ({
                          ...prev,
                          [mockQuestions.shortAnswer[currentQuestion].id]: e.target.value
                        }));
                      }}
                      rows={6}
                      className="resize-none"
                    />
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                    disabled={currentQuestion === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  
                  {currentQuestion < questions.length - 1 ? (
                    <Button onClick={() => setCurrentQuestion(currentQuestion + 1)}>
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : currentSection !== 'shortAnswer' ? (
                    <Button onClick={() => {
                      const nextSectionIndex = sections.findIndex(s => s.key === currentSection) + 1;
                      if (nextSectionIndex < sections.length) {
                        setCurrentSection(sections[nextSectionIndex].key);
                        setCurrentQuestion(0);
                      }
                    }}>
                      Next Section
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>

      {/* Fixed Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{answeredCount} / {totalQuestions} answered</span>
          </div>
          <Button onClick={handleSubmit} size="lg">
            Submit Test
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default TestInterface;
