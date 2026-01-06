import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, ThumbsUp, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { dbOperations, Submission, Question } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

// Calculate similarity between two strings (0-1)
const calculateSimilarity = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  const matrix: number[][] = [];
  for (let i = 0; i <= s1.length; i++) matrix[i] = [i];
  for (let j = 0; j <= s2.length; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const maxLen = Math.max(s1.length, s2.length);
  return 1 - matrix[s1.length][s2.length] / maxLen;
};

const SubmissionReview = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Teacher';
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [teacherRemarks, setTeacherRemarks] = useState('');
  const [questionMarks, setQuestionMarks] = useState<Record<string, number>>({});
  const [manualOverrides, setManualOverrides] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSubmission = async () => {
      try {
        const submissions = await dbOperations.getSubmissions();
        const found = submissions.find(s => s.id === submissionId);
        if (found) {
          setSubmission(found);
          setTeacherRemarks(found.teacherRemarks || '');
          const savedMarks = found.questionMarks || {};
          setQuestionMarks(savedMarks);
          const savedOverrides = found.manualOverrides || {};
          setManualOverrides(savedOverrides);
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
      <DashboardLayout userType="teacher" userName={userName}>
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      </DashboardLayout>
    );
  }

  if (!submission) {
    return (
      <DashboardLayout userType="teacher" userName={userName}>
        <div className="p-8 max-w-4xl mx-auto">
          <Card className="bg-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-muted-foreground">Submission not found.</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/teacher/submissions')}>
                Back to Submissions
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const normalizeMcqIndex = (
    correctAnswer: Question["correctAnswer"],
    options?: string[]
  ): number | null => {
    if (typeof correctAnswer === 'number' && Number.isFinite(correctAnswer)) return correctAnswer;
    if (typeof correctAnswer !== 'string') return null;

    const v = correctAnswer.trim();

    // Stored by TestCreationWizard as "option0", "option1", ...
    const optionMatch = /^option(\d+)$/.exec(v);
    if (optionMatch) return Number(optionMatch[1]);

    // Stored as numeric string
    const n = Number(v);
    if (Number.isFinite(n)) return n;

    // Stored as option text
    if (options?.length) {
      const idx = options.findIndex(
        (o) => o?.trim().toLowerCase() === v.toLowerCase()
      );
      if (idx >= 0) return idx;
    }

    return null;
  };

  const normalizeStudentMcqIndex = (studentAnswer: string | number | undefined): number | null => {
    if (typeof studentAnswer === 'number' && Number.isFinite(studentAnswer)) return studentAnswer;
    if (typeof studentAnswer === 'string') {
      const n = Number(studentAnswer);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  // Helper to check if MCQ is correct
  const isMcqCorrect = (q: Question, studentAnswer: string | number | undefined): boolean => {
    const studentIndex = normalizeStudentMcqIndex(studentAnswer);
    const correctIndex = normalizeMcqIndex(q.correctAnswer, q.options);
    return studentIndex !== null && correctIndex !== null && studentIndex === correctIndex;
  };

  // Helper to check if fill-in-blank is correct (65% similarity)
  const isFillBlankCorrect = (q: Question, studentAnswer: string | number | undefined): boolean => {
    if (typeof studentAnswer !== 'string' || !q.correctAnswer) return false;
    return calculateSimilarity(studentAnswer, q.correctAnswer as string) >= 0.65;
  };

  // Calculate scores with manual overrides
  const calculateScores = () => {
    let mcqScore = 0;
    let fillBlankScore = 0;
    
    questions.forEach(q => {
      const studentAnswer = getAnswerForQuestion(q.id);
      const hasOverride = manualOverrides[q.id] !== undefined;
      
      if (q.type === 'mcq') {
        const autoCorrect = isMcqCorrect(q, studentAnswer);
        const isCorrect = hasOverride ? manualOverrides[q.id] : autoCorrect;
        if (isCorrect) mcqScore += q.marks;
      }
      
      if (q.type === 'fillBlank') {
        const autoCorrect = isFillBlankCorrect(q, studentAnswer);
        const isCorrect = hasOverride ? manualOverrides[q.id] : autoCorrect;
        if (isCorrect) fillBlankScore += q.marks;
      }
    });
    
    return { mcqScore, fillBlankScore };
  };

  const handleApprove = async () => {
    try {
      const { mcqScore, fillBlankScore } = calculateScores();
      const shortQuestions = questions.filter(q => q.type === 'shortAnswer');
      const longQuestions = questions.filter(q => q.type === 'longAnswer');
      const shortAnswerMarksTotal = shortQuestions.reduce((sum, q) => sum + (questionMarks[q.id] || 0), 0);
      const longAnswerMarksTotal = longQuestions.reduce((sum, q) => sum + (questionMarks[q.id] || 0), 0);
      const totalScore = mcqScore + fillBlankScore + shortAnswerMarksTotal + longAnswerMarksTotal;
      
      await dbOperations.updateSubmission(submission.id, {
        status: 'graded',
        teacherRemarks,
        questionMarks,
        manualOverrides,
        mcqScore,
        fillBlankScore,
        totalAutoScore: mcqScore + fillBlankScore,
        shortAnswerMarks: shortAnswerMarksTotal,
        longAnswerMarks: longAnswerMarksTotal,
        finalScore: totalScore
      });
      toast({ title: "Submission graded successfully" });
      navigate('/teacher/submissions');
    } catch (error) {
      toast({ title: "Error updating submission", variant: "destructive" });
    }
  };

  const handleQuestionMarkChange = (questionId: string, marks: number) => {
    setQuestionMarks(prev => ({ ...prev, [questionId]: marks }));
  };

  const handleOverrideToggle = (questionId: string, isCorrect: boolean) => {
    setManualOverrides(prev => ({ ...prev, [questionId]: isCorrect }));
  };

  const getAnswerForQuestion = (questionId: string) => {
    const answer = submission.answers.find(a => a.questionId === questionId);
    return answer?.answer;
  };

  const mcqQuestions = questions.filter(q => q.type === 'mcq');
  const fillBlankQuestions = questions.filter(q => q.type === 'fillBlank');
  const shortAnswerQuestions = questions.filter(q => q.type === 'shortAnswer');
  const longAnswerQuestions = questions.filter(q => q.type === 'longAnswer');
  const { mcqScore: calculatedMcqScore, fillBlankScore: calculatedFillBlankScore } = calculateScores();
  const shortAnswerMarks = shortAnswerQuestions.reduce((sum, q) => sum + (questionMarks[q.id] || 0), 0);
  const longAnswerMarks = longAnswerQuestions.reduce((sum, q) => sum + (questionMarks[q.id] || 0), 0);
  const totalScore = calculatedMcqScore + calculatedFillBlankScore + shortAnswerMarks + longAnswerMarks;

  return (
    <DashboardLayout userType="teacher" userName={userName}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <Link 
          to="/teacher/submissions" 
          className="inline-flex items-center text-muted-foreground hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Submissions
        </Link>

        {/* Submission Header */}
        <Card className="bg-card mb-4 sm:mb-6">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div>
                <CardTitle className="text-lg sm:text-2xl">{submission.studentName}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Submitted: {new Date(submission.submittedAt).toLocaleString()}</CardDescription>
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="text-center">
                  <span className="text-2xl sm:text-3xl font-bold text-primary">{totalScore}</span>
                  <p className="text-xs text-muted-foreground">Total Score</p>
                </div>
                <Badge className={`text-xs sm:text-sm ${submission.status === 'graded' ? 'bg-chart-1/20 text-chart-1' : 'bg-chart-3/20 text-chart-3'}`}>
                  {submission.status === 'graded' ? 'Graded' : 'Pending'}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Student Answers */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6 order-2 lg:order-1">
            {/* MCQ Section */}
            {mcqQuestions.length > 0 && (
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">Multiple Choice Questions</CardTitle>
                  <CardDescription>MCQ Score: {calculatedMcqScore}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mcqQuestions.map((q, index) => {
                    const studentAnswer = getAnswerForQuestion(q.id);
                    const studentIndex = normalizeStudentMcqIndex(studentAnswer);
                    const correctIndex = normalizeMcqIndex(q.correctAnswer, q.options);

                    const autoCorrect = isMcqCorrect(q, studentAnswer);
                    const hasOverride = manualOverrides[q.id] !== undefined;
                    const isCorrect = hasOverride ? manualOverrides[q.id] : autoCorrect;

                    return (
                      <div key={q.id} className={`p-4 rounded-lg border-2 transition-all ${
                        isCorrect 
                          ? 'bg-emerald-500/10 border-emerald-500/30' 
                          : 'bg-destructive/10 border-destructive/30'
                      }`}>
                        <div className="flex items-start justify-between mb-3">
                          <p className="font-medium text-foreground">Q{index + 1}. {q.text}</p>
                          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                            isCorrect 
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                              : 'bg-destructive/20 text-destructive'
                          }`}>
                            {isCorrect ? (
                              <>
                                <CheckCircle2 className="h-4 w-4" />
                                Correct
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4" />
                                Incorrect
                              </>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          {q.options?.map((option, optIndex) => {
                            const isCorrectOption = correctIndex !== null && optIndex === correctIndex;
                            const isStudentAnswer = studentIndex !== null && optIndex === studentIndex;
                            const isWrongStudentAnswer = isStudentAnswer && !isCorrectOption;

                            return (
                              <div 
                                key={optIndex}
                                className={`p-3 rounded-lg flex items-center justify-between transition-all ${
                                  isCorrectOption 
                                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 font-medium' 
                                    : isWrongStudentAnswer
                                    ? 'bg-destructive/20 text-destructive border border-destructive/40'
                                    : 'bg-muted/50 text-muted-foreground'
                                }`}
                              >
                                <span>{option}</span>
                                <div className="flex items-center gap-2">
                                  {isCorrectOption && (
                                    <span className="flex items-center gap-1 text-xs bg-emerald-500/30 px-2 py-0.5 rounded-full">
                                      <CheckCircle2 className="h-3 w-3" /> Correct Answer
                                    </span>
                                  )}
                                  {isWrongStudentAnswer && (
                                    <span className="flex items-center gap-1 text-xs bg-destructive/30 px-2 py-0.5 rounded-full">
                                      <XCircle className="h-3 w-3" /> Student's Answer
                                    </span>
                                  )}
                                  {isStudentAnswer && isCorrectOption && (
                                    <span className="flex items-center gap-1 text-xs bg-emerald-500/30 px-2 py-0.5 rounded-full">
                                      <CheckCircle2 className="h-3 w-3" /> Student's Answer
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                          <Label className="text-sm text-muted-foreground">Override: Mark as correct</Label>
                          <Switch 
                            checked={isCorrect}
                            onCheckedChange={(checked) => handleOverrideToggle(q.id, checked)}
                          />
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
                  <CardDescription>Fill Blank Score: {calculatedFillBlankScore}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fillBlankQuestions.map((q, index) => {
                    const studentAnswer = getAnswerForQuestion(q.id);
                    const autoCorrect = isFillBlankCorrect(q, studentAnswer);
                    const hasOverride = manualOverrides[q.id] !== undefined;
                    const isCorrect = hasOverride ? manualOverrides[q.id] : autoCorrect;
                    const similarity = typeof studentAnswer === 'string' && q.correctAnswer 
                      ? Math.round(calculateSimilarity(studentAnswer, q.correctAnswer as string) * 100) 
                      : 0;
                    
                    return (
                      <div key={q.id} className={`p-4 rounded-lg border-2 transition-all ${
                        isCorrect 
                          ? 'bg-emerald-500/10 border-emerald-500/30' 
                          : 'bg-destructive/10 border-destructive/30'
                      }`}>
                        <div className="flex items-start justify-between mb-3">
                          <p className="font-medium text-foreground">Q{index + 1}. {q.text}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-xs ${
                              similarity >= 65 ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400' : 'border-destructive/50 text-destructive'
                            }`}>
                              {similarity}% match
                            </Badge>
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              isCorrect 
                                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                                : 'bg-destructive/20 text-destructive'
                            }`}>
                              {isCorrect ? (
                                <><CheckCircle2 className="h-3 w-3" /> Correct</>
                              ) : (
                                <><XCircle className="h-3 w-3" /> Incorrect</>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className={`p-3 rounded-lg border ${
                            isCorrect 
                              ? 'bg-emerald-500/10 border-emerald-500/30' 
                              : 'bg-destructive/10 border-destructive/30'
                          }`}>
                            <p className="text-xs text-muted-foreground mb-1">Student's Answer</p>
                            <p className={`font-medium ${isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                              {studentAnswer || 'No answer provided'}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                            <p className="text-xs text-muted-foreground mb-1">Correct Answer</p>
                            <p className="font-medium text-emerald-600 dark:text-emerald-400">{q.correctAnswer}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                          <Label className="text-sm text-muted-foreground">Override: Mark as correct</Label>
                          <Switch 
                            checked={isCorrect}
                            onCheckedChange={(checked) => handleOverrideToggle(q.id, checked)}
                          />
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
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-foreground">Q{index + 1}. {q.text}</p>
                          <Badge variant="outline">{q.marks} marks</Badge>
                        </div>
                        <div className="bg-card p-3 rounded border border-border mb-3">
                          <p className="text-sm text-foreground">{studentAnswer || 'No answer provided'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Award marks:</Label>
                          <Input 
                            type="number"
                            min={0}
                            max={q.marks}
                            className="w-20"
                            value={questionMarks[q.id] ?? 0}
                            onChange={(e) => handleQuestionMarkChange(q.id, parseInt(e.target.value) || 0)}
                          />
                          <span className="text-sm text-muted-foreground">/ {q.marks}</span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Long Answers */}
            {longAnswerQuestions.length > 0 && (
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">Long Answer Questions</CardTitle>
                  <CardDescription>Review and assign marks for detailed answers</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {longAnswerQuestions.map((q, index) => {
                    const studentAnswer = getAnswerForQuestion(q.id);
                    
                    return (
                      <div key={q.id} className="p-4 bg-accent rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-foreground">Q{index + 1}. {q.text}</p>
                          <Badge variant="outline">{q.marks} marks</Badge>
                        </div>
                        <div className="bg-card p-4 rounded border border-border mb-3 min-h-[120px]">
                          <p className="text-sm text-foreground whitespace-pre-wrap">{studentAnswer || 'No answer provided'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Award marks:</Label>
                          <Input 
                            type="number"
                            min={0}
                            max={q.marks}
                            className="w-20"
                            value={questionMarks[q.id] ?? 0}
                            onChange={(e) => handleQuestionMarkChange(q.id, parseInt(e.target.value) || 0)}
                          />
                          <span className="text-sm text-muted-foreground">/ {q.marks}</span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6 order-1 lg:order-2">
            {/* Grading Summary */}
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Edit3 className="h-5 w-5" />
                  Grading Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">MCQ Score</span>
                  <span className="font-medium">{calculatedMcqScore}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fill Blank Score</span>
                  <span className="font-medium">{calculatedFillBlankScore}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Short Answer Marks</span>
                  <span className="font-medium">{shortAnswerMarks}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Long Answer Marks</span>
                  <span className="font-medium">{longAnswerMarks}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-medium">Total Score</span>
                  <span className="font-bold text-primary">{totalScore}</span>
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
                  {submission.status === 'graded' ? 'Update Grade' : 'Approve & Grade'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SubmissionReview;
