import { useParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { mockTests } from '@/data/mockData';
import { ArrowLeft, AlertTriangle, CheckCircle2, Brain, Clock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';

const TestInstructions = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);
  const test = mockTests.find((t) => t.id === testId);

  if (!test) {
    navigate('/student/dashboard');
    return null;
  }

  const instructions = [
    'Read each question carefully before answering.',
    'You cannot go back to previous questions once submitted.',
    'Your answers are auto-saved every 30 seconds.',
    'The timer will continue even if you close the browser.',
    'Ensure stable internet connection throughout the test.',
    'Do not use any external resources unless specified.',
    'Contact support immediately if you face technical issues.',
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header userType="student" userName="Alex Thompson" />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link 
          to={`/student/test/${testId}/details`}
          className="inline-flex items-center text-muted-foreground hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Test Details
        </Link>

        <Card className="bg-card mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">Test Instructions</CardTitle>
            <CardDescription>{test.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Test Info Summary */}
            <div className="flex flex-wrap gap-4 p-4 bg-accent rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent-foreground" />
                <span className="text-foreground">{test.duration} minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-accent-foreground" />
                <span className="text-foreground">{test.totalMarks} marks</span>
              </div>
            </div>

            {/* Instructions List */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                General Instructions
              </h3>
              <ul className="space-y-3">
                {instructions.map((instruction, index) => (
                  <li key={index} className="flex items-start gap-3 text-muted-foreground">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center">
                      {index + 1}
                    </span>
                    {instruction}
                  </li>
                ))}
              </ul>
            </div>

            {/* AI Disclaimer */}
            <Alert className="bg-accent border-primary/20">
              <Brain className="h-4 w-4" />
              <AlertTitle>AI-Powered Evaluation</AlertTitle>
              <AlertDescription>
                Your responses will be evaluated using AI technology. The AI provides initial scores 
                and feedback, which are then reviewed by your teacher for final grading. 
                AI evaluation is designed to be fair and consistent, but teacher oversight 
                ensures accuracy and addresses any edge cases.
              </AlertDescription>
            </Alert>

            {/* Warning */}
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Once you start the test, the timer will begin and cannot be paused. 
                Make sure you have sufficient time to complete the test without interruptions.
              </AlertDescription>
            </Alert>

            {/* Acceptance Checkbox */}
            <div className="flex items-start gap-3 p-4 border border-border rounded-lg">
              <Checkbox 
                id="accept" 
                checked={accepted}
                onCheckedChange={(checked) => setAccepted(checked as boolean)}
              />
              <label htmlFor="accept" className="text-sm text-muted-foreground cursor-pointer">
                I have read and understood the instructions. I agree to abide by the test rules 
                and understand that any violation may result in disqualification.
              </label>
            </div>

            {/* Start Button */}
            <div className="flex justify-end">
              <Button 
                size="lg"
                disabled={!accepted}
                onClick={() => navigate(`/student/test/${testId}/take`)}
              >
                Start Test
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TestInstructions;
