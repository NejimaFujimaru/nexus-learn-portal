import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Users, FileText, ClipboardList, Plus, Eye, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { dbOperations, Subject, Test, Submission } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Teacher';
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    const unsubSubjects = dbOperations.subscribeToSubjects(setSubjects);
    const unsubTests = dbOperations.subscribeToTests(setTests);
    const unsubSubmissions = dbOperations.subscribeToSubmissions(setSubmissions);
    return () => {
      unsubSubjects();
      unsubTests();
      unsubSubmissions();
    };
  }, []);

  const pendingSubmissions = submissions.filter(s => s.status === 'pending');

  const stats = [
    { icon: BookOpen, label: 'Total Subjects', value: subjects.length, color: 'text-primary' },
    { icon: FileText, label: 'Total Tests', value: tests.length, color: 'text-chart-1' },
    { icon: ClipboardList, label: 'Pending Submissions', value: pendingSubmissions.length, color: 'text-chart-3' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header userType="teacher" userName={userName} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back, {userName}!</h1>
          <p className="text-muted-foreground">Manage your classes and review student submissions.</p>
        </div>

        {/* Stats Grid */}
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

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Button size="lg" onClick={() => navigate('/teacher/subjects')}>
            <BookOpen className="h-5 w-5 mr-2" />
            Manage Subjects
          </Button>
          <Button size="lg" onClick={() => navigate('/teacher/create-test')}>
            <Plus className="h-5 w-5 mr-2" />
            Create Test
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/teacher/submissions')}>
            <Eye className="h-5 w-5 mr-2" />
            View Submissions
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/teacher/students')}>
            <Users className="h-5 w-5 mr-2" />
            Manage Students
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Pending Submissions */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-chart-3" />
                Pending Submissions
              </CardTitle>
              <CardDescription>Submissions awaiting your review</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingSubmissions.length > 0 ? (
                <div className="space-y-4">
                  {pendingSubmissions.slice(0, 4).map((submission) => (
                    <div 
                      key={submission.id} 
                      className="flex items-center justify-between p-3 bg-accent rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-foreground">{submission.studentName}</p>
                        <p className="text-sm text-muted-foreground">
                          Score: {submission.totalAutoScore} (auto-graded)
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate(`/teacher/submission/${submission.id}`)}
                      >
                        Review
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending submissions</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Tests */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Recent Tests
              </CardTitle>
              <CardDescription>Your recently created assessments</CardDescription>
            </CardHeader>
            <CardContent>
              {tests.length > 0 ? (
                <div className="space-y-4">
                  {tests.slice(0, 4).map((test) => (
                    <div 
                      key={test.id} 
                      className="flex items-center justify-between p-3 bg-accent rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-foreground">{test.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{test.type}</Badge>
                          <span className="text-xs text-muted-foreground">{test.duration} min</span>
                        </div>
                      </div>
                      <Badge 
                        variant="secondary"
                        className={test.published 
                          ? 'bg-chart-1/20 text-chart-1' 
                          : 'bg-chart-3/20 text-chart-3'
                        }
                      >
                        {test.published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tests created yet</p>
                </div>
              )}
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => navigate('/teacher/create-test')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Test
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default TeacherDashboard;
