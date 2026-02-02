import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  ChevronDown,
  Trophy,
  Target,
  Clock,
  Brain,
  Sparkles
} from 'lucide-react';
import { getPracticeSubmission, PracticeSubmission } from '@/lib/practice-db';
import { dbOperations, Question } from '@/lib/firebase';
import { toast } from 'sonner';

const PracticeResult: React.FC = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [submission, setSubmission] = useState<PracticeSubmission | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadData = async () => {
      if (!submissionId || !user) return;
      
      try {
        const sub = await getPracticeSubmission(submissionId);
        if (!sub) {
          toast.error('Practice result not found');
          navigate('/student/practice');
          return;
        }
        
        // Verify ownership
        if (sub.studentId !== user.uid) {
          toast.error('You do not have access to this result');
          navigate('/student/practice');
          return;
        }
        
        setSubmission(sub);
        
        // Load questions
        const questionsData = await dbOperations.getQuestionsByTest(sub.testId);
        setQuestions(questionsData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading practice result:', error);
        toast.error('Failed to load practice result');
        navigate('/student/practice');
      }
    };
    
    loadData();
  }, [submissionId, user, navigate]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Group questions by type
  const groupedQuestions = questions.reduce((acc, q) => {
    const type = q.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(q);
    return acc;
  }, {} as Record<string, Question[]>);

  const questionTypeLabels: Record<string, string> = {
    mcq: 'Multiple Choice',
    fillBlank: 'Fill in the Blanks',
    shortAnswer: 'Short Answer',
    longAnswer: 'Long Answer'
  };

  if (loading) {
    return (
      <DashboardLayout userType="student" userName={user?.displayName || 'Student'}>
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-muted-foreground">Loading practice result...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!submission) return null;

  const { grading } = submission;

  return (
    <DashboardLayout userType="student" userName={user?.displayName || 'Student'}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/student/practice')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <Badge variant="outline" className="mb-2">Practice Result</Badge>
            <h1 className="text-2xl font-bold text-foreground">{submission.testTitle}</h1>
            <p className="text-muted-foreground">{submission.subjectName}</p>
          </div>
        </div>

        {/* Score Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold text-foreground">{grading.percentage}%</p>
              <p className="text-sm text-muted-foreground">Overall Score</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-accent" />
              <p className="text-3xl font-bold text-foreground">
                {grading.totalScore}/{grading.maxScore}
              </p>
              <p className="text-sm text-muted-foreground">Marks Obtained</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold text-foreground">
                {grading.results.filter(r => r.isCorrect).length}
              </p>
              <p className="text-sm text-muted-foreground">Correct Answers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-lg font-medium text-foreground">
                {formatDate(submission.submittedAt).split(',')[0]}
              </p>
              <p className="text-sm text-muted-foreground">Practiced On</p>
            </CardContent>
          </Card>
        </div>

        {/* AI Feedback */}
        {grading.overallFeedback && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">{grading.overallFeedback}</p>
            </CardContent>
          </Card>
        )}

        {/* Question Breakdown by Type */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Detailed Breakdown</h2>
          
          {Object.entries(groupedQuestions).map(([type, typeQuestions]) => {
            const typeResults = grading.results.filter(r => 
              typeQuestions.some(q => q.id === r.questionId)
            );
            const typeScore = typeResults.reduce((sum, r) => sum + r.marksObtained, 0);
            const typeMaxScore = typeResults.reduce((sum, r) => sum + r.maxMarks, 0);
            const typePercentage = typeMaxScore > 0 ? Math.round((typeScore / typeMaxScore) * 100) : 0;
            
            return (
              <Collapsible
                key={type}
                open={expandedSections[type]}
                onOpenChange={() => toggleSection(type)}
              >
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Brain className="h-5 w-5 text-primary" />
                          <div className="text-left">
                            <CardTitle className="text-lg">
                              {questionTypeLabels[type] || type}
                            </CardTitle>
                            <CardDescription>
                              {typeQuestions.length} question{typeQuestions.length !== 1 ? 's' : ''} • 
                              {typeScore}/{typeMaxScore} marks
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-32">
                            <Progress value={typePercentage} className="h-2" />
                          </div>
                          <span className="font-bold text-foreground">{typePercentage}%</span>
                          <ChevronDown className={`h-5 w-5 transition-transform ${
                            expandedSections[type] ? 'rotate-180' : ''
                          }`} />
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <ScrollArea className="max-h-[400px]">
                        <div className="space-y-4">
                          {typeQuestions.map((question, idx) => {
                            const result = grading.results.find(r => r.questionId === question.id);
                            const studentAnswer = submission.answers[question.id!];
                            
                            return (
                              <div
                                key={question.id}
                                className={`p-4 rounded-lg border ${
                                  result?.isCorrect 
                                    ? 'border-primary/30 bg-primary/5' 
                                    : 'border-destructive/30 bg-destructive/5'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  {result?.isCorrect ? (
                                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                                  ) : (
                                    <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                                  )}
                                  <div className="flex-1 space-y-2">
                                    <p className="font-medium text-foreground">
                                      Q{idx + 1}: {question.text}
                                    </p>
                                    
                                    {/* Show answer details based on type */}
                                    {type === 'mcq' && question.options && (
                                      <div className="space-y-1">
                                        <p className="text-sm">
                                          <span className="text-muted-foreground">Your answer: </span>
                                          <span className={result?.isCorrect ? 'text-primary' : 'text-destructive'}>
                                            {question.options[Number(studentAnswer)] || 'Not answered'}
                                          </span>
                                        </p>
                                        {!result?.isCorrect && (
                                          <p className="text-sm">
                                            <span className="text-muted-foreground">Correct answer: </span>
                                            <span className="text-primary">
                                              {question.options[Number(question.correctAnswer)]}
                                            </span>
                                          </p>
                                        )}
                                      </div>
                                    )}
                                    
                                    {type === 'fillBlank' && (
                                      <div className="space-y-1">
                                        <p className="text-sm">
                                          <span className="text-muted-foreground">Your answer: </span>
                                          <span className={result?.isCorrect ? 'text-primary' : 'text-destructive'}>
                                            {String(studentAnswer) || 'Not answered'}
                                          </span>
                                        </p>
                                        {!result?.isCorrect && (
                                          <p className="text-sm">
                                            <span className="text-muted-foreground">Correct answer: </span>
                                            <span className="text-primary">{String(question.correctAnswer)}</span>
                                          </p>
                                        )}
                                      </div>
                                    )}
                                    
                                    {(type === 'shortAnswer' || type === 'longAnswer') && (
                                      <div className="space-y-2">
                                        <div className="p-3 rounded bg-muted">
                                          <p className="text-sm text-muted-foreground mb-1">Your answer:</p>
                                          <p className="text-sm text-foreground">
                                            {String(studentAnswer) || 'Not answered'}
                                          </p>
                                        </div>
                                        {question.correctAnswer && (
                                          <div className="p-3 rounded bg-primary/10">
                                            <p className="text-sm text-muted-foreground mb-1">Model answer:</p>
                                            <p className="text-sm text-foreground">
                                              {String(question.correctAnswer)}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Feedback */}
                                    {result?.feedback && (
                                      <p className="text-sm text-muted-foreground italic">
                                        {result.feedback}
                                      </p>
                                    )}
                                    
                                    {/* Marks */}
                                    <div className="flex items-center justify-end">
                                      <Badge variant={result?.isCorrect ? 'default' : 'secondary'}>
                                        {result?.marksObtained}/{result?.maxMarks} marks
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => navigate('/student/practice')}>
            Back to Practice Hub
          </Button>
          <Button onClick={() => navigate(`/student/practice-test/${submission.testId}`)}>
            Practice Again
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PracticeResult;
