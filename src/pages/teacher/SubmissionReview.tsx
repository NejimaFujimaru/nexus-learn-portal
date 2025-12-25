import { useParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { mockSubmissions, mockQuestions, mockStudentAnswers } from '@/data/mockData';
import { ArrowLeft, Brain, CheckCircle2, XCircle, AlertCircle, ThumbsUp, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

const SubmissionReview = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const submission = mockSubmissions.find((s) => s.id === submissionId);
  
  const [teacherRemarks, setTeacherRemarks] = useState('');
  const [adjustedScore, setAdjustedScore] = useState(submission?.aiScore?.toString() || '');

  if (!submission) {
    return (
      <div className="min-h-screen bg-background">
        <Header userType="teacher" userName="Dr. Sarah Mitchell" />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Card className="bg-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-muted-foreground">Submission not found.</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/teacher/submissions')}>
                Back to Submissions
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const handleApprove = () => {
    toast({
      title: "Submission Approved (Demo)",
      description: "The result has been approved and sent to the student.",
    });
    navigate('/teacher/submissions');
  };

  const handleRequestRevision = () => {
    toast({
      title: "Revision Requested (Demo)",
      description: "AI will re-evaluate the submission with your feedback.",
    });
  };

  const handleOverrideScore = () => {
    toast({
      title: "Score Updated (Demo)",
      description: `Score updated to ${adjustedScore}%.`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header userType="teacher" userName="Dr. Sarah Mitchell" />
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link 
          to="/teacher/submissions" 
          className="inline-flex items-center text-muted-foreground hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Submissions
        </Link>

        {/* Submission Header */}
        <Card className="bg-card mb-6">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">{submission.studentName}</CardTitle>
                <CardDescription>{submission.testName}</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    <span className="text-3xl font-bold text-primary">{submission.aiScore}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">AI Score</p>
                </div>
                <div className="text-center">
                  <Badge 
                    variant="outline" 
                    className={submission.aiConfidence && submission.aiConfidence >= 85 
                      ? 'border-chart-1 text-chart-1' 
                      : 'border-chart-5 text-chart-5'
                    }
                  >
                    {submission.aiConfidence}% confident
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Student Answers */}
          <div className="lg:col-span-2 space-y-6">
            {/* MCQ Section */}
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-lg">Multiple Choice Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockQuestions.mcq.map((q, index) => {
                  const studentAnswer = mockStudentAnswers.mcq.find(a => a.questionId === q.id);
                  const isCorrect = studentAnswer?.selectedOption === q.correctAnswer;
                  
                  return (
                    <div key={q.id} className="p-4 bg-accent rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-foreground">Q{index + 1}. {q.question}</p>
                        {isCorrect ? (
                          <CheckCircle2 className="h-5 w-5 text-chart-1 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                        )}
                      </div>
                      <div className="space-y-1 text-sm">
                        {q.options.map((option, optIndex) => (
                          <div 
                            key={optIndex}
                            className={`p-2 rounded ${
                              optIndex === q.correctAnswer 
                                ? 'bg-chart-1/20 text-chart-1' 
                                : optIndex === studentAnswer?.selectedOption && !isCorrect
                                ? 'bg-destructive/20 text-destructive'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {option}
                            {optIndex === q.correctAnswer && ' ✓'}
                            {optIndex === studentAnswer?.selectedOption && optIndex !== q.correctAnswer && ' (Student answer)'}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Fill in the Blanks */}
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-lg">Fill in the Blanks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockQuestions.fillBlanks.map((q, index) => {
                  const studentAnswer = mockStudentAnswers.fillBlanks.find(a => a.questionId === q.id);
                  const isCorrect = studentAnswer?.answer.toLowerCase() === q.answer.toLowerCase();
                  
                  return (
                    <div key={q.id} className="p-4 bg-accent rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-foreground">Q{index + 1}. {q.question}</p>
                        {isCorrect ? (
                          <CheckCircle2 className="h-5 w-5 text-chart-1 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-sm space-y-1">
                        <p><span className="text-muted-foreground">Student Answer:</span> <span className={isCorrect ? 'text-chart-1' : 'text-destructive'}>{studentAnswer?.answer}</span></p>
                        <p><span className="text-muted-foreground">Correct Answer:</span> <span className="text-chart-1">{q.answer}</span></p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Short Answers */}
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-lg">Short Answer Questions</CardTitle>
                <CardDescription>AI-evaluated responses - review for accuracy</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockQuestions.shortAnswer.map((q, index) => {
                  const studentAnswer = mockStudentAnswers.shortAnswer.find(a => a.questionId === q.id);
                  
                  return (
                    <div key={q.id} className="p-4 bg-accent rounded-lg">
                      <p className="font-medium text-foreground mb-2">Q{index + 1}. {q.question}</p>
                      <div className="bg-card p-3 rounded border border-border">
                        <p className="text-sm text-foreground">{studentAnswer?.answer}</p>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Brain className="h-3 w-3" />
                        AI Assessment: Good understanding demonstrated
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Score Override */}
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Edit3 className="h-5 w-5" />
                  Score Override
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Adjusted Score (%)</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="number" 
                      value={adjustedScore}
                      onChange={(e) => setAdjustedScore(e.target.value)}
                      min={0}
                      max={100}
                    />
                    <Button variant="outline" onClick={handleOverrideScore}>
                      Update
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Teacher Remarks */}
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-lg">Teacher Remarks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea 
                  placeholder="Add your feedback for the student..."
                  value={teacherRemarks}
                  onChange={(e) => setTeacherRemarks(e.target.value)}
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" onClick={handleApprove}>
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Approve Result
                </Button>
                <Button variant="outline" className="w-full" onClick={handleRequestRevision}>
                  <Brain className="h-4 w-4 mr-2" />
                  Request AI Re-evaluation
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SubmissionReview;
