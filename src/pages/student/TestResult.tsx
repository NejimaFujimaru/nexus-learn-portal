import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ArrowLeft, Trophy, Brain, MessageSquare, TrendingUp, AlertCircle, Loader2, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { dbOperations, Test, Submission, Question } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface QuestionBreakdown {
  questionId: string;
  questionText: string;
  type: string;
  studentAnswer: string | number;
  correctAnswer?: string | number;
  isCorrect: boolean;
  marksObtained: number;
  totalMarks: number;
  teacherComment?: string;
}

const TestResult = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [test, setTest] = useState<Test | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Collapsible states for each section
  const [mcqOpen, setMcqOpen] = useState(false);
  const [fillBlankOpen, setFillBlankOpen] = useState(false);
  const [shortAnswerOpen, setShortAnswerOpen] = useState(false);
  const [longAnswerOpen, setLongAnswerOpen] = useState(false);

  const userName = user?.displayName || user?.email?.split('@')[0] || 'Student';

  useEffect(() => {
    const loadData = async () => {
      if (!testId || !user) return;
      
      const tests = await dbOperations.getTests();
      const found = tests.find(t => t.id === testId);
      setTest(found || null);

      // Fetch questions for this test
      const testQuestions = await dbOperations.getQuestionsByTest(testId);
      setQuestions(testQuestions);

      // Find submission for current student
      const submissions = await dbOperations.getSubmissionsByStudent(user.uid);
      const sub = submissions.find(s => s.testId === testId);
      setSubmission(sub || null);
      
      setLoading(false);
    };
    loadData();
  }, [testId, user]);

  // Get questions by type
  const getQuestionsByType = (type: string) => questions.filter(q => q.type === type);
  
  // Calculate marks by type
  const calculateTypeMarks = (type: string) => {
    const typeQuestions = getQuestionsByType(type);
    const totalPossible = typeQuestions.reduce((acc, q) => acc + (q.marks || 0), 0);
    
    let obtained = 0;
    if (type === 'mcq' && submission?.mcqScore !== undefined) {
      obtained = submission.mcqScore;
    } else if (type === 'fillBlank' && submission?.fillBlankScore !== undefined) {
      obtained = submission.fillBlankScore;
    } else if (type === 'shortAnswer' && submission?.shortAnswerMarks !== undefined) {
      obtained = submission.shortAnswerMarks;
    } else if (type === 'longAnswer' && submission?.longAnswerMarks !== undefined) {
      obtained = submission.longAnswerMarks;
    } else if (submission?.questionMarks) {
      // Sum up individual question marks for this type
      typeQuestions.forEach(q => {
        if (submission.questionMarks?.[q.id]) {
          obtained += submission.questionMarks[q.id];
        }
      });
    }
    
    return { obtained, totalPossible, percentage: totalPossible > 0 ? (obtained / totalPossible) * 100 : 0 };
  };

  // Build question breakdown for a type
  const getQuestionBreakdown = (type: string): QuestionBreakdown[] => {
    const typeQuestions = getQuestionsByType(type);
    
    return typeQuestions.map(q => {
      const studentAnswerObj = submission?.answers?.find(a => a.questionId === q.id);
      const studentAnswer = studentAnswerObj?.answer ?? 'No answer';
      
      let isCorrect = false;
      let marksObtained = 0;
      
      if (type === 'mcq' || type === 'fillBlank') {
        isCorrect = String(studentAnswer).toLowerCase().trim() === String(q.correctAnswer ?? '').toLowerCase().trim();
        marksObtained = isCorrect ? (q.marks || 0) : 0;
      } else {
        // For short/long answer, use questionMarks if available
        marksObtained = submission?.questionMarks?.[q.id] ?? 0;
        isCorrect = marksObtained >= (q.marks || 0) * 0.5; // Consider 50%+ as partially correct
      }
      
      return {
        questionId: q.id,
        questionText: q.text,
        type: q.type,
        studentAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        marksObtained,
        totalMarks: q.marks || 0,
      };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!test || !submission) {
    return (
      <DashboardLayout userType="student" userName={userName}>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Card className="bg-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-muted-foreground">Result not found.</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/student/dashboard')}>
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
      </DashboardLayout>
    );
  }

  // Use finalScore if available (graded by teacher), otherwise use totalAutoScore
  const totalScore = submission.finalScore ?? submission.totalAutoScore ?? 0;
  const totalMarks = test.totalMarks || 100;
  const percentage = Math.round((totalScore / totalMarks) * 100);

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-chart-1';
    if (percentage >= 75) return 'text-primary';
    if (percentage >= 60) return 'text-chart-3';
    if (percentage >= 40) return 'text-chart-5';
    return 'text-destructive';
  };

  const getGradeLabel = (percentage: number) => {
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 75) return 'Good';
    if (percentage >= 60) return 'Satisfactory';
    if (percentage >= 40) return 'Needs Improvement';
    return 'Below Average';
  };

  // Section breakdown component
  const SectionBreakdown = ({ 
    title, 
    type, 
    isOpen, 
    onToggle 
  }: { 
    title: string; 
    type: string; 
    isOpen: boolean; 
    onToggle: () => void;
  }) => {
    const { obtained, totalPossible, percentage } = calculateTypeMarks(type);
    const breakdown = getQuestionBreakdown(type);
    
    if (totalPossible === 0) return null;

    return (
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <div className="space-y-1.5 sm:space-y-2">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between text-xs sm:text-sm group cursor-pointer hover:bg-accent/50 rounded-lg p-2 -m-2 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-foreground font-medium">{title}</span>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <span className="text-muted-foreground">{obtained} / {totalPossible} marks</span>
            </button>
          </CollapsibleTrigger>
          <Progress value={percentage} className="h-1.5 sm:h-2" />
          
          <CollapsibleContent className="pt-3">
            <div className="space-y-3 pl-2 border-l-2 border-border">
              {breakdown.map((item, idx) => (
                <div key={item.questionId} className="p-3 bg-accent/30 rounded-lg space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground flex-1">
                      Q{idx + 1}: {item.questionText}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.isCorrect ? (
                        <Check className="h-4 w-4 text-chart-1" />
                      ) : (
                        <X className="h-4 w-4 text-destructive" />
                      )}
                      <Badge variant="outline" className="text-xs">
                        {item.marksObtained}/{item.totalMarks}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid gap-2 text-sm">
                    <div className={cn(
                      "p-2 rounded border",
                      item.isCorrect ? "bg-chart-1/10 border-chart-1/30" : "bg-destructive/10 border-destructive/30"
                    )}>
                      <span className="text-muted-foreground text-xs">Your Answer:</span>
                      <p className="text-foreground">{String(item.studentAnswer)}</p>
                    </div>
                    
                    {(type === 'mcq' || type === 'fillBlank') && item.correctAnswer !== undefined && (
                      <div className="p-2 rounded border bg-chart-1/10 border-chart-1/30">
                        <span className="text-muted-foreground text-xs">Correct Answer:</span>
                        <p className="text-chart-1 font-medium">{String(item.correctAnswer)}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  };

  // Check if AI feedback exists
  const hasAIFeedback = submission.status === 'graded' && 
    (submission.teacherRemarks || submission.finalScore !== undefined);

  return (
    <DashboardLayout userType="student" userName={userName}>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link 
          to="/student/dashboard" 
          className="inline-flex items-center text-muted-foreground hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>

        {/* Score Card */}
        <Card className="bg-card mb-4 sm:mb-6">
          <CardHeader className="text-center pb-2 sm:pb-4 p-4 sm:p-6">
            <div className="flex justify-center mb-3 sm:mb-4">
              <div className="p-3 sm:p-4 bg-primary/10 rounded-full">
                <Trophy className="h-8 w-8 sm:h-12 sm:w-12 text-primary" />
              </div>
            </div>
            <CardTitle className="text-lg sm:text-xl">{test.title}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">{test.subjectName || test.subjectId}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="text-center mb-4 sm:mb-6">
              <div className={`text-4xl sm:text-6xl font-bold ${getGradeColor(percentage)}`}>
                {percentage}%
              </div>
              <div className="text-sm sm:text-lg text-muted-foreground mt-1 sm:mt-2">
                {totalScore} / {totalMarks} marks
              </div>
              <Badge className={`mt-2 sm:mt-3 ${getGradeColor(percentage)}`} variant="secondary">
                {getGradeLabel(percentage)}
              </Badge>
            </div>

            <Separator className="my-4 sm:my-6" />

            {/* Section Breakdown with Clickable Dropdowns */}
            <div>
              <h3 className="font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Section Breakdown
                <span className="text-xs text-muted-foreground font-normal">(Click to expand)</span>
              </h3>
              <div className="space-y-4 sm:space-y-5">
                <SectionBreakdown 
                  title="MCQ" 
                  type="mcq" 
                  isOpen={mcqOpen} 
                  onToggle={() => setMcqOpen(!mcqOpen)} 
                />
                <SectionBreakdown 
                  title="Fill in the Blanks" 
                  type="fillBlank" 
                  isOpen={fillBlankOpen} 
                  onToggle={() => setFillBlankOpen(!fillBlankOpen)} 
                />
                <SectionBreakdown 
                  title="Short Answer" 
                  type="shortAnswer" 
                  isOpen={shortAnswerOpen} 
                  onToggle={() => setShortAnswerOpen(!shortAnswerOpen)} 
                />
                <SectionBreakdown 
                  title="Long Answer" 
                  type="longAnswer" 
                  isOpen={longAnswerOpen} 
                  onToggle={() => setLongAnswerOpen(!longAnswerOpen)} 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Feedback - Only show when feedback exists */}
        {hasAIFeedback && (
          <Card className="bg-card mb-4 sm:mb-6">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                AI Feedback
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Automated analysis of your performance</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="p-3 sm:p-4 bg-accent rounded-lg">
                <p className="text-foreground leading-relaxed text-sm sm:text-base">
                  Your test has been reviewed. Based on your performance:
                  {percentage >= 90 && " Excellent work! You've demonstrated a strong understanding of the material."}
                  {percentage >= 75 && percentage < 90 && " Good job! You have a solid grasp of most concepts."}
                  {percentage >= 60 && percentage < 75 && " You're on the right track. Focus on the areas highlighted in the breakdown."}
                  {percentage >= 40 && percentage < 60 && " There's room for improvement. Review the questions you missed."}
                  {percentage < 40 && " Consider revisiting the study material and practicing more."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Teacher Remarks - Only show when remarks exist */}
        {submission.teacherRemarks && (
          <Card className="bg-card">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Teacher Remarks
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Personal feedback from your instructor</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="p-3 sm:p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-foreground leading-relaxed text-sm sm:text-base">
                  {submission.teacherRemarks}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </DashboardLayout>
  );
};

export default TestResult;