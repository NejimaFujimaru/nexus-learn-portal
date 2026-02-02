import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { dbOperations, Test, Question, getTestById } from '@/lib/firebase';
import { gradePracticeTest, PracticeQuestion, PracticeAnswer } from '@/lib/practice-grader';
import { addPracticeSubmission } from '@/lib/practice-db';
import { GradingAnimation, GradingComplete } from '@/components/practice/GradingAnimation';

type ViewState = 'test' | 'grading' | 'complete';

const PracticeTestInterface: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [viewState, setViewState] = useState<ViewState>('test');
  const [gradingStage, setGradingStage] = useState('');
  const [gradingProgress, setGradingProgress] = useState(0);
  const [gradingResult, setGradingResult] = useState<{ score: number; maxScore: number } | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  // Load test and questions
  useEffect(() => {
    const loadTest = async () => {
      if (!testId) return;
      
      try {
        const testData = await getTestById(testId);
        if (!testData) {
          toast.error('Test not found');
          navigate('/student/practice');
          return;
        }
        
        setTest(testData);
        setTimeLeft((testData.duration || 30) * 60);
        
        const questionsData = await dbOperations.getQuestionsByTest(testId);
        setQuestions(questionsData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading test:', error);
        toast.error('Failed to load test');
        navigate('/student/practice');
      }
    };
    
    loadTest();
  }, [testId, navigate]);

  // Timer
  useEffect(() => {
    if (viewState !== 'test' || loading || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [viewState, loading, timeLeft]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId: string, value: string | number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = useCallback(async () => {
    if (!test || !user) return;
    
    setViewState('grading');
    setGradingProgress(0);
    setGradingStage('Preparing your answers...');
    
    // Simulate initial progress
    const progressInterval = setInterval(() => {
      setGradingProgress(prev => Math.min(prev + 5, 90));
    }, 500);
    
    try {
      // Convert questions to practice format
      const practiceQuestions: PracticeQuestion[] = questions.map(q => ({
        id: q.id!,
        type: q.type,
        text: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        marks: q.marks || 1
      }));
      
      // Convert answers to practice format
      const practiceAnswers: PracticeAnswer[] = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer
      }));
      
      // Grade with AI
      const result = await gradePracticeTest(
        practiceQuestions,
        practiceAnswers,
        (stage) => setGradingStage(stage)
      );
      
      clearInterval(progressInterval);
      setGradingProgress(100);
      
      // Save to practiceSubmissions (NOT regular submissions!)
      const id = await addPracticeSubmission({
        studentId: user.uid,
        studentName: user.displayName || 'Student',
        testId: testId!,
        testTitle: test.title,
        subjectName: test.subjectName || 'General',
        answers,
        grading: result,
        practiceStreak: 1,
        submittedAt: new Date().toISOString()
      });
      
      setSubmissionId(id);
      setGradingResult({
        score: result.totalScore,
        maxScore: result.maxScore
      });
      
      // Short delay before showing completion
      setTimeout(() => {
        setViewState('complete');
      }, 500);
      
    } catch (error) {
      console.error('Error grading practice test:', error);
      clearInterval(progressInterval);
      toast.error('Failed to grade practice test. Please try again.');
      setViewState('test');
    }
  }, [test, user, questions, answers, testId]);

  const handleViewResults = () => {
    if (submissionId) {
      navigate(`/student/practice-result/${submissionId}`);
    } else {
      navigate('/student/practice');
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progressPercentage = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  if (loading) {
    return (
      <DashboardLayout userType="student" userName={user?.displayName || 'Student'}>
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-muted-foreground">Loading practice test...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (viewState === 'grading') {
    return (
      <DashboardLayout userType="student" userName={user?.displayName || 'Student'}>
        <Card>
          <GradingAnimation stage={gradingStage} progress={gradingProgress} />
        </Card>
      </DashboardLayout>
    );
  }

  if (viewState === 'complete' && gradingResult) {
    return (
      <DashboardLayout userType="student" userName={user?.displayName || 'Student'}>
        <Card>
          <GradingComplete 
            score={gradingResult.score} 
            maxScore={gradingResult.maxScore}
            onViewResults={handleViewResults}
          />
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="student" userName={user?.displayName || 'Student'}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Badge variant="outline" className="mb-2">Practice Mode</Badge>
            <h1 className="text-2xl font-bold text-foreground">{test?.title}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              timeLeft < 300 ? 'bg-destructive/10 text-destructive' : 'bg-muted'
            }`}>
              <Clock className="h-5 w-5" />
              <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="text-foreground">{answeredCount}/{questions.length} answered</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Question Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Question {currentQuestionIndex + 1} of {questions.length}</CardTitle>
              <Badge variant="secondary">{currentQuestion?.type}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-lg text-foreground">{currentQuestion?.text}</p>

            {/* Answer Input based on question type */}
            {currentQuestion?.type === 'mcq' && currentQuestion.options && (
              <RadioGroup
                value={String(answers[currentQuestion.id!] ?? '')}
                onValueChange={(val) => handleAnswerChange(currentQuestion.id!, parseInt(val))}
              >
                {currentQuestion.options.map((option, idx) => (
                  <div key={idx} className="flex items-center space-x-2 p-3 border border-border rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value={String(idx)} id={`option-${idx}`} />
                    <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {currentQuestion?.type === 'fillBlank' && (
              <Input
                placeholder="Enter your answer..."
                value={String(answers[currentQuestion.id!] ?? '')}
                onChange={(e) => handleAnswerChange(currentQuestion.id!, e.target.value)}
              />
            )}

            {currentQuestion?.type === 'shortAnswer' && (
              <Textarea
                placeholder="Enter your short answer..."
                value={String(answers[currentQuestion.id!] ?? '')}
                onChange={(e) => handleAnswerChange(currentQuestion.id!, e.target.value)}
                rows={3}
              />
            )}

            {currentQuestion?.type === 'longAnswer' && (
              <Textarea
                placeholder="Enter your detailed answer..."
                value={String(answers[currentQuestion.id!] ?? '')}
                onChange={(e) => handleAnswerChange(currentQuestion.id!, e.target.value)}
                rows={6}
              />
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {currentQuestionIndex < questions.length - 1 ? (
                <Button
                  onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Submit Practice Test
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Question Navigation Pills */}
        <div className="flex flex-wrap gap-2">
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setCurrentQuestionIndex(idx)}
              className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                idx === currentQuestionIndex
                  ? 'bg-primary text-primary-foreground'
                  : answers[q.id!] !== undefined
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PracticeTestInterface;
