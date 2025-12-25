import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, ThumbsUp, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { dbOperations, Submission, Question } from '@/lib/firebase';

const SubmissionReview = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [teacherRemarks, setTeacherRemarks] = useState('');
  const [shortAnswerMarks, setShortAnswerMarks] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSubmission = async () => {
      try {
        const submissions = await dbOperations.getSubmissions();
        const found = submissions.find(s => s.id === submissionId);
        if (found) {
          setSubmission(found);
          setTeacherRemarks(found.teacherRemarks || '');
          setShortAnswerMarks(found.shortAnswerMarks?.toString() || '0');
          const testQuestions = await dbOperations.getQuestionsByTest(found.testId);
          setQuestions(testQuestions);
        }
      } catch (error) {
        console.error('Error loading submission:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSubmission();
  }, [submissionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header userType="teacher" userName="Dr. Sarah Mitchell" />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        </main>
      </div>
    );
  }

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

  const handleApprove = async () => {
    try {
      await dbOperations.updateSubmission(submission.id, {
        status: 'graded',
        teacherRemarks,
        shortAnswerMarks: parseInt(shortAnswerMarks) || 0
      });
      toast({ title: "Submission graded successfully" });
      navigate('/teacher/submissions');
    } catch (error) {
      toast({ title: "Error updating submission", variant: "destructive" });
    }
  };

  const getAnswerForQuestion = (questionId: string) => {
    const answer = submission.answers.find(a => a.questionId === questionId);
    return answer?.answer;
  };

  const mcqQuestions = questions.filter(q => q.type === 'mcq');
  const fillBlankQuestions = questions.filter(q => q.type === 'fillBlank');
  const shortAnswerQuestions = questions.filter(q => q.type === 'shortAnswer');

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
                <CardDescription>Submitted: {new Date(submission.submittedAt).toLocaleString()}</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <span className="text-3xl font-bold text-primary">{submission.totalAutoScore}</span>
                  <p className="text-xs text-muted-foreground">Auto Score</p>
                </div>
                <Badge className={submission.status === 'graded' ? 'bg-chart-1/20 text-chart-1' : 'bg-chart-3/20 text-chart-3'}>
                  {submission.status === 'graded' ? 'Graded' : 'Pending'}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Student Answers */}
          <div className="lg:col-span-2 space-y-6">
            {/* MCQ Section */}
            {mcqQuestions.length > 0 && (
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">Multiple Choice Questions</CardTitle>
                  <CardDescription>MCQ Score: {submission.mcqScore}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mcqQuestions.map((q, index) => {
                    const studentAnswer = getAnswerForQuestion(q.id);
                    const isCorrect = studentAnswer === q.correctAnswer;
                    
                    return (
                      <div key={q.id} className="p-4 bg-accent rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-foreground">Q{index + 1}. {q.text}</p>
                          {isCorrect ? (
                            <CheckCircle2 className="h-5 w-5 text-chart-1 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                          )}
                        </div>
                        <div className="space-y-1 text-sm">
                          {q.options?.map((option, optIndex) => (
                            <div 
                              key={optIndex}
                              className={`p-2 rounded ${
                                optIndex === q.correctAnswer 
                                  ? 'bg-chart-1/20 text-chart-1' 
                                  : optIndex === studentAnswer && !isCorrect
                                  ? 'bg-destructive/20 text-destructive'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {option}
                              {optIndex === q.correctAnswer && ' ✓'}
                              {optIndex === studentAnswer && optIndex !== q.correctAnswer && ' (Student)'}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Fill in the Blanks */}
            {fillBlankQuestions.length > 0 && (
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">Fill in the Blanks</CardTitle>
                  <CardDescription>Fill Blank Score: {submission.fillBlankScore}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fillBlankQuestions.map((q, index) => {
                    const studentAnswer = getAnswerForQuestion(q.id);
                    const isCorrect = typeof studentAnswer === 'string' && 
                      studentAnswer.toLowerCase().trim() === (q.correctAnswer as string).toLowerCase().trim();
                    
                    return (
                      <div key={q.id} className="p-4 bg-accent rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-foreground">Q{index + 1}. {q.text}</p>
                          {isCorrect ? (
                            <CheckCircle2 className="h-5 w-5 text-chart-1 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                          )}
                        </div>
                        <div className="text-sm space-y-1">
                          <p><span className="text-muted-foreground">Student:</span> <span className={isCorrect ? 'text-chart-1' : 'text-destructive'}>{studentAnswer}</span></p>
                          <p><span className="text-muted-foreground">Correct:</span> <span className="text-chart-1">{q.correctAnswer}</span></p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Short Answers */}
            {shortAnswerQuestions.length > 0 && (
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">Short Answer Questions</CardTitle>
                  <CardDescription>Review and assign marks for these answers</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {shortAnswerQuestions.map((q, index) => {
                    const studentAnswer = getAnswerForQuestion(q.id);
                    
                    return (
                      <div key={q.id} className="p-4 bg-accent rounded-lg">
                        <p className="font-medium text-foreground mb-2">Q{index + 1}. {q.text}</p>
                        <div className="bg-card p-3 rounded border border-border">
                          <p className="text-sm text-foreground">{studentAnswer || 'No answer provided'}</p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Short Answer Marks */}
            {shortAnswerQuestions.length > 0 && (
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Edit3 className="h-5 w-5" />
                    Short Answer Marks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Marks for Short Answers</Label>
                    <Input 
                      type="number" 
                      value={shortAnswerMarks}
                      onChange={(e) => setShortAnswerMarks(e.target.value)}
                      min={0}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

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
                  {submission.status === 'graded' ? 'Update Grade' : 'Approve & Grade'}
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
