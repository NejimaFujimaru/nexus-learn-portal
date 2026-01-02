import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { ArrowLeft, Trophy, Brain, MessageSquare, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { dbOperations, Test, Submission } from '@/lib/firebase';

const TestResult = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!testId) return;
      const tests = await dbOperations.getTests();
      const found = tests.find(t => t.id === testId);
      setTest(found || null);

      // Try to find submission for this test
      const submissions = await dbOperations.getSubmissions();
      const sub = submissions.find(s => s.testId === testId);
      setSubmission(sub || null);
      
      setLoading(false);
    };
    loadData();
  }, [testId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!test || !submission) {
    return (
      <div className="min-h-screen bg-background">
        <Header userType="student" userName="Alex Thompson" />
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
      </div>
    );
  }

  const totalScore = submission.totalAutoScore || 0;
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

  return (
    <div className="min-h-screen bg-background">
      <Header userType="student" userName="Alex Thompson" />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link 
          to="/student/dashboard" 
          className="inline-flex items-center text-muted-foreground hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>

        {/* Score Card */}
        <Card className="bg-card mb-6">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <Trophy className="h-12 w-12 text-primary" />
              </div>
            </div>
            <CardTitle className="text-xl">{test.title}</CardTitle>
            <CardDescription>{test.subjectName || test.subjectId}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <div className={`text-6xl font-bold ${getGradeColor(percentage)}`}>
                {percentage}%
              </div>
              <div className="text-lg text-muted-foreground mt-2">
                {totalScore} / {totalMarks} marks
              </div>
              <Badge className={`mt-3 ${getGradeColor(percentage)}`} variant="secondary">
                {getGradeLabel(percentage)}
              </Badge>
            </div>

            <Separator className="my-6" />

            {/* Section Breakdown */}
            <div>
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Section Breakdown
              </h3>
              <div className="space-y-4">
                {submission.mcqScore !== undefined && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground font-medium">MCQ</span>
                      <span className="text-muted-foreground">{submission.mcqScore} marks</span>
                    </div>
                    <Progress value={(submission.mcqScore / totalMarks) * 100} className="h-2" />
                  </div>
                )}
                {submission.fillBlankScore !== undefined && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground font-medium">Fill in the Blanks</span>
                      <span className="text-muted-foreground">{submission.fillBlankScore} marks</span>
                    </div>
                    <Progress value={(submission.fillBlankScore / totalMarks) * 100} className="h-2" />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Feedback */}
        <Card className="bg-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="h-5 w-5 text-primary" />
              AI Feedback
            </CardTitle>
            <CardDescription>Automated analysis of your performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-accent rounded-lg">
              <p className="text-foreground leading-relaxed">
                {submission.status === 'graded' 
                  ? 'Your test has been reviewed. Check the breakdown above for detailed scores.'
                  : 'Your test is pending review. Results will be available soon.'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Teacher Remarks */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-primary" />
              Teacher Remarks
            </CardTitle>
            <CardDescription>Personal feedback from your instructor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-foreground leading-relaxed">
                {submission.teacherRemarks || 'No remarks yet. Check back after your teacher reviews your submission.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TestResult;
