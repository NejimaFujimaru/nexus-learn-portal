import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { dbOperations, Test } from '@/lib/firebase';
import { ArrowLeft, Calendar, Clock, FileText, BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';

const TestDetails = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);

  const userName = user?.displayName || user?.email?.split('@')[0] || 'Student';

  useEffect(() => {
    const loadTest = async () => {
      try {
        const tests = await dbOperations.getTests();
        const found = tests.find(t => t.id === testId);
        setTest(found || null);
      } catch (error) {
        console.error('Error loading test:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTest();
  }, [testId]);

  if (loading) {
    return (
      <DashboardLayout userType="student" userName={userName}>
        <main className="max-w-4xl mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </DashboardLayout>
    );
  }

  if (!test) {
    return (
      <DashboardLayout userType="student" userName={userName}>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Card className="bg-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-muted-foreground">Test not found.</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/student/dashboard')}>
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
      </DashboardLayout>
    );
  }

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

        <Card className="bg-card">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge variant="outline" className="text-xs">{test.type}</Badge>
              {test.subjectName && <Badge variant="secondary" className="text-xs">{test.subjectName}</Badge>}
            </div>
            <CardTitle className="text-lg sm:text-2xl">{test.title}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Review the test details before starting
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Test Type</p>
                    <p className="font-medium text-sm sm:text-base text-foreground">{test.type}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Subject</p>
                    <p className="font-medium text-sm sm:text-base text-foreground">{test.subjectName || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium text-sm sm:text-base text-foreground">{test.duration} minutes</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Created Date</p>
                    <p className="font-medium text-sm sm:text-base text-foreground">
                      {new Date(test.createdAt).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 bg-accent rounded-lg">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Marks</p>
                <p className="text-xl sm:text-2xl font-bold text-accent-foreground">{test.totalMarks || 'N/A'}</p>
              </div>
              <Button 
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => navigate(`/student/test/${testId}/instructions`)}
              >
                Begin Test
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </DashboardLayout>
  );
};

export default TestDetails;
