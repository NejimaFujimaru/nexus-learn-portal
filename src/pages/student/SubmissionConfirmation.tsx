import { useParams, useNavigate } from 'react-router-dom';
import { mockTests } from '@/data/mockData';
import { CheckCircle2, Clock, Brain, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const SubmissionConfirmation = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const test = mockTests.find((t) => t.id === testId);

  const submissionTime = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="bg-card max-w-lg w-full text-center">
        <CardHeader className="pb-4">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-chart-1/20 rounded-full">
              <CheckCircle2 className="h-16 w-16 text-chart-1" />
            </div>
          </div>
          <CardTitle className="text-2xl text-foreground">Test Submitted Successfully!</CardTitle>
          <CardDescription className="text-base">
            Your responses have been recorded
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-accent rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Test</span>
              <span className="font-medium text-foreground">{test?.name || 'Mathematics Unit Test 1'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Submitted At</span>
              <span className="font-medium text-foreground text-sm">{submissionTime}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <span className="font-medium text-primary">Pending AI Evaluation</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-left">
                <p className="font-medium text-foreground">What happens next?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your answers will be evaluated by our AI system and reviewed by your teacher. 
                  Results are typically available within 24-48 hours.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => navigate('/student/dashboard')}
            >
              <Home className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <Button 
              className="flex-1"
              onClick={() => navigate('/student/history')}
            >
              View Academic History
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubmissionConfirmation;
