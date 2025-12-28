import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { BookOpen, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TestCard } from '@/components/TestCard';
import { dbOperations, Test, Submission, auth } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

const StudentDashboard = () => {
  const { user } = useAuth();
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
  }, []);

  const submittedTestIds = submissions.map(s => s.testId);
  const pendingTests = tests.filter(t => !submittedTestIds.includes(t.id));
  const completedTests = tests.filter(t => submittedTestIds.includes(t.id));

  const stats = [
    { icon: BookOpen, label: 'Available Tests', value: pendingTests.length, color: 'text-primary' },
    { icon: CheckCircle, label: 'Completed', value: completedTests.length, color: 'text-chart-1' },
    { icon: Clock, label: 'Pending', value: pendingTests.length, color: 'text-chart-3' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header userType="student" userName={userName} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back, {userName}!</h1>
          <p className="text-muted-foreground">Here's an overview of your learning progress.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-card-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="pending">Pending Tests ({pendingTests.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedTests.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="space-y-6">
            {pendingTests.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingTests.map((test) => (
                  <TestCard key={test.id} test={{
                    id: test.id, name: test.title, type: test.type as any,
                    subject: '', chapters: [], date: test.createdAt,
                    duration: test.duration, totalMarks: 0, status: 'upcoming'
                  }} />
                ))}
              </div>
            ) : (
              <Card className="bg-card"><CardContent className="py-12 text-center text-muted-foreground">No pending tests</CardContent></Card>
            )}
          </TabsContent>
          <TabsContent value="completed" className="space-y-6">
            {completedTests.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedTests.map((test) => (
                  <TestCard key={test.id} test={{
                    id: test.id, name: test.title, type: test.type as any,
                    subject: '', chapters: [], date: test.createdAt,
                    duration: test.duration, totalMarks: 0, status: 'completed'
                  }} />
                ))}
              </div>
            ) : (
              <Card className="bg-card"><CardContent className="py-12 text-center text-muted-foreground">No completed tests</CardContent></Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default StudentDashboard;
