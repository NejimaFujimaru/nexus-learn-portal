import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { dbOperations, Test } from '@/lib/firebase';
import { ArrowLeft, AlertTriangle, CheckCircle2, Brain, Clock, Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';

const TestInstructions = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [accepted, setAccepted] = useState(false);
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

  const instructions = [
    'Read each question carefully before answering.',
    'You cannot go back to previous questions once submitted.',
    'Your answers are auto-saved every 30 seconds.',
    'The timer will continue even if you close the browser.',
    'Ensure stable internet connection throughout the test.',
    'Do not use any external resources unless specified.',
    'Contact support immediately if you face technical issues.',
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header userType="student" userName={userName} />
        <main className="max-w-4xl mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (!test) {
    navigate('/student/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userType="student" userName={userName} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link 
          to={`/student/test/${testId}/details`}
          className="inline-flex items-center text-muted-foreground hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Test Details
        </Link>

        <Card className="bg-card mb-4 sm:mb-6">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-2xl">Test Instructions</CardTitle>
            <CardDescription className="text-xs sm:text-sm">{test.title}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4 sm:space-y-6">
            {/* Test Info Summary */}
            <div className="flex flex-wrap gap-3 sm:gap-4 p-3 sm:p-4 bg-accent rounded-lg">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-accent-foreground" />
                <span className="text-sm sm:text-base text-foreground">{test.duration} minutes</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-accent-foreground" />
                <span className="text-sm sm:text-base text-foreground">{test.totalMarks || 'N/A'} marks</span>
              </div>
            </div>

            {/* Instructions List */}
            <div className="space-y-2 sm:space-y-3">
              <h3 className="font-semibold text-sm sm:text-base text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                General Instructions
              </h3>
              <ul className="space-y-2 sm:space-y-3">
                {instructions.map((instruction, index) => (
                  <li key={index} className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                    <span className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/10 text-primary text-xs sm:text-sm flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="pt-0.5">{instruction}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* AI Disclaimer */}
            <Alert className="bg-accent border-primary/20">
              <Brain className="h-4 w-4" />
              <AlertTitle className="text-sm sm:text-base">AI-Powered Evaluation</AlertTitle>
              <AlertDescription className="text-xs sm:text-sm">
                Your responses will be evaluated using AI technology. The AI provides initial scores 
                and feedback, which are then reviewed by your teacher for final grading.
              </AlertDescription>
            </Alert>

            {/* Warning */}
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-sm sm:text-base">Important</AlertTitle>
              <AlertDescription className="text-xs sm:text-sm">
                Once you start the test, the timer will begin and cannot be paused. 
                Make sure you have sufficient time to complete the test.
              </AlertDescription>
            </Alert>

            {/* Acceptance Checkbox */}
            <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 border border-border rounded-lg">
              <Checkbox 
                id="accept" 
                checked={accepted}
                onCheckedChange={(checked) => setAccepted(checked as boolean)}
                className="mt-0.5"
              />
              <label htmlFor="accept" className="text-xs sm:text-sm text-muted-foreground cursor-pointer">
                I have read and understood the instructions. I agree to abide by the test rules 
                and understand that any violation may result in disqualification.
              </label>
            </div>

            {/* Start Button */}
            <div className="flex justify-end">
              <Button 
                size="sm"
                disabled={!accepted}
                className="w-full sm:w-auto"
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