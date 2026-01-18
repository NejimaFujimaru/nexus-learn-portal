import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { BookOpen, CheckCircle, Clock, TrendingUp, Target, Award, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TestCard } from '@/components/TestCard';
import { dbOperations, Test, Submission } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tests, setTests] = useState<Test[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const studentId = user?.uid || 'demo-student';
  
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Student';

  useEffect(() => {
    const unsubTests = dbOperations.subscribeToTests((data) => {
      setTests(data.filter(t => t.published));
    });
    const unsubSubmissions = dbOperations.subscribeToSubmissions((data) => {
      setSubmissions(data.filter(s => s.studentId === studentId));
    });
    return () => { unsubTests(); unsubSubmissions(); };
  }, [studentId]);

  const submittedTestIds = submissions.map(s => s.testId);
  const pendingTests = tests.filter(t => !submittedTestIds.includes(t.id));
  const completedTests = tests.filter(t => submittedTestIds.includes(t.id));

  // Calculate performance stats using real totalMarks per test
  const gradedSubmissions = submissions.filter((s) => s.status === 'graded');
  const scoredWithTests = gradedSubmissions.map((s) => {
    const relatedTest = tests.find((t) => t.id === s.testId);
    const possible = relatedTest?.totalMarks ?? 100; // fallback to 100 if missing
    const obtained = s.finalScore ?? s.totalAutoScore ?? 0;
    return { obtained, possible };
  });
  const totalScore = scoredWithTests.reduce((acc, v) => acc + v.obtained, 0);
  const totalPossible = scoredWithTests.reduce((acc, v) => acc + v.possible, 0);
  const averageScore = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;

  const stats = [
    { icon: BookOpen, label: 'Available', value: pendingTests.length, color: 'text-primary' },
    { icon: CheckCircle, label: 'Completed', value: completedTests.length, color: 'text-chart-1' },
    { icon: Clock, label: 'Pending Review', value: submissions.filter(s => s.status === 'pending').length, color: 'text-chart-3' },
  ];

  return (
    <DashboardLayout userType="student" userName={userName}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Welcome back, {userName}!</h1>
          <p className="text-muted-foreground">Here's an overview of your learning progress.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-card">
              <CardContent className="p-3 sm:pt-6">
                <div className="flex flex-col items-center sm:flex-row sm:items-center gap-2 sm:gap-3 text-center sm:text-left">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-card-foreground">{stat.value}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Performance Overview Section */}
        <Card className="bg-card mb-6 sm:mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Performance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Average Score */}
              <div className="flex items-center gap-3 p-4 bg-accent/50 rounded-lg">
                <div className="p-3 rounded-full bg-primary/10">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{averageScore}%</p>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                </div>
              </div>

              {/* Tests Taken */}
              <div className="flex items-center gap-3 p-4 bg-accent/50 rounded-lg">
                <div className="p-3 rounded-full bg-chart-1/10">
                  <CheckCircle className="h-6 w-6 text-chart-1" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{completedTests.length}</p>
                  <p className="text-sm text-muted-foreground">Tests Taken</p>
                </div>
              </div>

              {/* Achievements */}
              <div className="flex items-center gap-3 p-4 bg-accent/50 rounded-lg">
                <div className="p-3 rounded-full bg-chart-2/10">
                  <Award className="h-6 w-6 text-chart-2" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{gradedSubmissions.length}</p>
                  <p className="text-sm text-muted-foreground">Graded Tests</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
              <Button size="sm" onClick={() => navigate('/student/history')}>
                <TrendingUp className="h-4 w-4 mr-2" />
                View History
              </Button>
              {pendingTests.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => navigate(`/student/test/${pendingTests[0].id}/details`)}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Next Test
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tests Tabs */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="pending">Pending Tests ({pendingTests.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedTests.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="space-y-6">
            {pendingTests.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {pendingTests.map((test) => (
                  <TestCard key={test.id} test={{...test, status: 'upcoming'}} />
                ))}
              </div>
            ) : (
              <Card className="bg-card">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending tests - you're all caught up!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="completed" className="space-y-6">
            {completedTests.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {completedTests.map((test) => (
                  <TestCard key={test.id} test={{...test, status: 'completed'}} />
                ))}
              </div>
            ) : (
              <Card className="bg-card">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No completed tests yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
