import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Users, FileText, ClipboardList, Plus, Eye, BookOpen, GraduationCap } from 'lucide-react';
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

  // Quick stats cards
  const quickStats = [
    { icon: BookOpen, label: 'Subjects', value: subjects.length, color: 'text-primary', path: '/teacher/subjects' },
    { icon: Users, label: 'Students', value: '--', color: 'text-chart-2', path: '/teacher/students' },
    { icon: FileText, label: 'Tests', value: tests.length, color: 'text-chart-1', path: '/teacher/create-test' },
    { icon: ClipboardList, label: 'Submissions', value: pendingSubmissions.length, color: 'text-chart-3', path: '/teacher/submissions' },
  ];

  return (
    <DashboardLayout userType="teacher" userName={userName}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Welcome back, {userName}!</h1>
          <p className="text-muted-foreground">Manage your classes and review student submissions.</p>
        </div>

        {/* Quick Stats Grid - 4 Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {quickStats.map((stat, index) => (
            <Card 
              key={index} 
              className="bg-card cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(stat.path)}
            >
              <CardContent className="p-4 sm:pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 w-fit">
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
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

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 sm:gap-4 mb-6 sm:mb-8">
          <Button size="sm" className="text-xs sm:text-sm h-9 sm:h-10" onClick={() => navigate('/teacher/subjects')}>
            <BookOpen className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Manage</span> Subjects
          </Button>
          <Button size="sm" className="text-xs sm:text-sm h-9 sm:h-10" onClick={() => navigate('/teacher/create-test')}>
            <Plus className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Create</span> Test
          </Button>
          <Button size="sm" variant="outline" className="text-xs sm:text-sm h-9 sm:h-10" onClick={() => navigate('/teacher/submissions')}>
            <Eye className="h-4 w-4 mr-1 sm:mr-2" />
            Submissions
          </Button>
          <Button size="sm" variant="outline" className="text-xs sm:text-sm h-9 sm:h-10" onClick={() => navigate('/teacher/students')}>
            <Users className="h-4 w-4 mr-1 sm:mr-2" />
            Students
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Pending Submissions */}
          <Card className="bg-card">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <ClipboardList className="h-5 w-5 text-chart-3" />
                Pending Submissions
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Submissions awaiting your review</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              {pendingSubmissions.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {pendingSubmissions.slice(0, 4).map((submission) => (
                    <div 
                      key={submission.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 p-3 bg-accent rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm sm:text-base text-foreground">{submission.studentName}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Score: {submission.totalAutoScore} (auto-graded)
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="w-full sm:w-auto text-xs sm:text-sm"
                        onClick={() => navigate(`/teacher/submission/${submission.id}`)}
                      >
                        Review
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  <ClipboardList className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No pending submissions</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Tests */}
          <Card className="bg-card">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <FileText className="h-5 w-5 text-primary" />
                Recent Tests
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Your recently created assessments</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              {tests.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {tests.slice(0, 4).map((test) => (
                    <div 
                      key={test.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-accent rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm sm:text-base text-foreground">{test.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{test.type}</Badge>
                          <span className="text-xs text-muted-foreground">{test.duration} min</span>
                        </div>
                      </div>
                      <Badge 
                        variant="secondary"
                        className={`text-xs w-fit ${test.published 
                          ? 'bg-chart-1/20 text-chart-1' 
                          : 'bg-chart-3/20 text-chart-3'
                        }`}
                      >
                        {test.published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  <FileText className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No tests created yet</p>
                </div>
              )}
              <Button 
                variant="outline" 
                className="w-full mt-4 text-sm"
                onClick={() => navigate('/teacher/create-test')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Test
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
