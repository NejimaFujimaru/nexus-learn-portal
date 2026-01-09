import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  Brain, 
  History, 
  RefreshCw, 
  TrendingUp, 
  CheckCircle, 
  Target,
  Flame,
  Sparkles,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { dbOperations, Test, Submission } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

const PracticeHub = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Student';
  const studentId = user?.uid || '';
  
  const [tests, setTests] = useState<Test[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubTests = dbOperations.subscribeToTests((data) => {
      setTests(data.filter(t => t.published));
    });
    const unsubSubmissions = dbOperations.subscribeToSubmissions((data) => {
      setSubmissions(data.filter(s => s.studentId === studentId));
      setLoading(false);
    });
    return () => { 
      unsubTests(); 
      unsubSubmissions(); 
    };
  }, [studentId]);

  // Get completed tests with submissions
  const completedTestIds = submissions.map(s => s.testId);
  const completedTests = tests.filter(t => completedTestIds.includes(t.id));
  
  // Calculate stats
  const totalQuestionsPracticed = submissions.reduce((acc, s) => acc + (s.answers?.length || 0), 0);
  const gradedSubmissions = submissions.filter(s => s.status === 'graded');
  const totalScore = gradedSubmissions.reduce((acc, s) => acc + (s.finalScore || s.totalAutoScore || 0), 0);
  const avgAccuracy = gradedSubmissions.length > 0 
    ? Math.round((totalScore / (gradedSubmissions.length * 100)) * 100) 
    : 0;
  
  // Calculate streak (mock - would need real data)
  const practiceStreak = Math.min(submissions.length, 7);

  const stats = [
    { icon: Flame, label: 'Day Streak', value: practiceStreak, color: 'text-orange-500' },
    { icon: Target, label: 'Questions', value: totalQuestionsPracticed, color: 'text-primary' },
    { icon: TrendingUp, label: 'Accuracy', value: `${avgAccuracy}%`, color: 'text-chart-1' },
  ];

  const handlePracticeAgain = (testId: string) => {
    // Navigate to practice mode (could be a different interface later)
    navigate(`/student/test/${testId}/instructions?practice=true`);
  };

  return (
    <DashboardLayout userType="student" userName={userName}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Practice Hub</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Strengthen your knowledge with practice tests</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-card">
              <CardContent className="p-3 sm:p-4 sm:pt-6">
                <div className="flex flex-col items-center sm:flex-row sm:items-center gap-2 sm:gap-3 text-center sm:text-left">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-lg sm:text-2xl font-bold text-card-foreground">{stat.value}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="practice" className="space-y-4 sm:space-y-6">
          <TabsList className="bg-muted w-full sm:w-auto">
            <TabsTrigger value="practice" className="flex-1 sm:flex-none text-xs sm:text-sm">AI Practice</TabsTrigger>
            <TabsTrigger value="past" className="flex-1 sm:flex-none text-xs sm:text-sm">Past Tests</TabsTrigger>
          </TabsList>

          <TabsContent value="practice">
            {/* AI Tutor Coming Soon */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="py-8 sm:py-12 text-center">
                <div className="inline-flex p-4 rounded-full bg-primary/10 mb-4">
                  <Brain className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-2">AI Tutor Coming Soon</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm sm:text-base">
                  Get personalized practice questions, instant feedback, and adaptive learning 
                  powered by AI. Practice anytime, anywhere.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Personalized Questions
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Instant Feedback
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Track Progress
                  </Badge>
                </div>
                <Button disabled className="gap-2">
                  <Brain className="h-4 w-4" />
                  Notify Me When Available
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="past">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : completedTests.length === 0 ? (
              <Card className="bg-card">
                <CardContent className="py-12 text-center">
                  <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-2">No completed tests yet</p>
                  <p className="text-sm text-muted-foreground">Complete a test to practice it again</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Completed Tests ({completedTests.length})</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completedTests.map((test) => {
                    const submission = submissions.find(s => s.testId === test.id);
                    return (
                      <Card key={test.id} className="bg-card hover:shadow-md transition-shadow">
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-base sm:text-lg truncate">{test.title}</CardTitle>
                          <CardDescription className="text-xs sm:text-sm">
                            {test.subjectName || 'General'} • {test.duration} min
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="outline" className="text-xs">{test.type}</Badge>
                            {submission && (
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${
                                  submission.status === 'graded' 
                                    ? 'bg-chart-1/20 text-chart-1' 
                                    : 'bg-chart-3/20 text-chart-3'
                                }`}
                              >
                                {submission.status === 'graded' 
                                  ? `${submission.finalScore || submission.totalAutoScore}%` 
                                  : 'Pending'}
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="flex-1 text-xs sm:text-sm"
                              onClick={() => navigate(`/student/test/${test.id}/result`)}
                            >
                              <History className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              View Result
                            </Button>
                            <Button 
                              size="sm"
                              className="flex-1 text-xs sm:text-sm"
                              onClick={() => handlePracticeAgain(test.id)}
                            >
                              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              Practice
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default PracticeHub;
