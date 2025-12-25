import { useParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { mockTests, mockTestResults } from '@/data/mockData';
import { ArrowLeft, Trophy, Brain, MessageSquare, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const TestResult = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const test = mockTests.find((t) => t.id === testId);
  const result = mockTestResults.find((r) => r.testId === testId);

  if (!test || !result) {
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
            <CardTitle className="text-xl">{test.name}</CardTitle>
            <CardDescription>{test.subject}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <div className={`text-6xl font-bold ${getGradeColor(result.percentage)}`}>
                {result.percentage}%
              </div>
              <div className="text-lg text-muted-foreground mt-2">
                {result.score} / {result.totalMarks} marks
              </div>
              <Badge className={`mt-3 ${getGradeColor(result.percentage)}`} variant="secondary">
                {getGradeLabel(result.percentage)}
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
                {result.sectionBreakdown.map((section, index) => {
                  const sectionPercentage = (section.obtained / section.total) * 100;
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground font-medium">{section.section}</span>
                        <span className="text-muted-foreground">
                          {section.obtained} / {section.total} ({Math.round(sectionPercentage)}%)
                        </span>
                      </div>
                      <Progress value={sectionPercentage} className="h-2" />
                    </div>
                  );
                })}
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
              <p className="text-foreground leading-relaxed">{result.aiFeedback}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-3 italic">
              * This feedback was generated by AI and reviewed by your teacher.
            </p>
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
              <p className="text-foreground leading-relaxed">{result.teacherRemarks}</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TestResult;
