import { useParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { mockTests } from '@/data/mockData';
import { ArrowLeft, Calendar, Clock, FileText, BookOpen, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const TestDetails = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const test = mockTests.find((t) => t.id === testId);

  if (!test) {
    return (
      <div className="min-h-screen bg-background">
        <Header userType="student" userName="Alex Thompson" />
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
      </div>
    );
  }

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

        <Card className="bg-card">
          <CardHeader>
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge variant="outline">{test.type}</Badge>
              <Badge variant="secondary">{test.subject}</Badge>
            </div>
            <CardTitle className="text-2xl">{test.name}</CardTitle>
            <CardDescription>
              Review the test details before starting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Test Type</p>
                    <p className="font-medium text-foreground">{test.type}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Subject</p>
                    <p className="font-medium text-foreground">{test.subject}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium text-foreground">{test.duration} minutes</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Scheduled Date</p>
                    <p className="font-medium text-foreground">
                      {new Date(test.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-foreground mb-3">Chapters Covered</h3>
              <div className="flex flex-wrap gap-2">
                {test.chapters.map((chapter, index) => (
                  <Badge key={index} variant="outline" className="bg-accent">
                    {chapter}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total Marks</p>
                <p className="text-2xl font-bold text-accent-foreground">{test.totalMarks}</p>
              </div>
              <Button 
                size="lg"
                onClick={() => navigate(`/student/test/${testId}/instructions`)}
              >
                Begin Test
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TestDetails;
