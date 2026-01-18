import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { FileText, Trophy, TrendingUp, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { dbOperations, Test, Submission } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const AcademicHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Student';
  const studentId = user?.uid || '';
  
  const [tests, setTests] = useState<Test[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    const unsubTests = dbOperations.subscribeToTests(setTests);
    const unsubSubmissions = dbOperations.subscribeToSubmissions((data) => {
      setSubmissions(data.filter(s => s.studentId === studentId));
    });
    return () => { unsubTests(); unsubSubmissions(); };
  }, [studentId]);

  const submittedTestIds = submissions.map((s) => s.testId);
  const completedTests = tests.filter((t) => submittedTestIds.includes(t.id));
  const upcomingTests = tests.filter((t) => !submittedTestIds.includes(t.id));
  
  // Compute avg and best percentages using real totalMarks
  const gradedSubmissions = submissions.filter((s) => s.status === 'graded');
  const scoredWithTests = gradedSubmissions.map((s) => {
    const relatedTest = tests.find((t) => t.id === s.testId);
    const possible = relatedTest?.totalMarks ?? 100;
    const obtained = s.finalScore ?? s.totalAutoScore ?? 0;
    return { obtained, possible };
  });
  const totalObtained = scoredWithTests.reduce((acc, v) => acc + v.obtained, 0);
  const totalPossible = scoredWithTests.reduce((acc, v) => acc + v.possible, 0);
  const averageScore = totalPossible > 0 ? Math.round((totalObtained / totalPossible) * 100) : 0;
  const highestScore = scoredWithTests.length > 0
    ? Math.round(
        Math.max(
          ...scoredWithTests.map((v) => (v.possible > 0 ? (v.obtained / v.possible) * 100 : 0)),
        ),
      )
    : 0;
  
  const getGradeColor = (percentage?: number) => {
    if (!percentage) return 'text-muted-foreground';
    if (percentage >= 90) return 'text-chart-1';
    if (percentage >= 75) return 'text-primary';
    if (percentage >= 60) return 'text-chart-3';
    if (percentage >= 40) return 'text-chart-5';
    return 'text-destructive';
  };

  // averageScore and highestScore now computed above using real totals

  return (
    <DashboardLayout userType="student" userName={userName}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Academic History</h1>
          <p className="text-muted-foreground">Track your learning progress and performance over time.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="bg-card">
            <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-card-foreground">{completedTests.length}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Tests</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card">
            <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-chart-1/20">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-chart-1" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-card-foreground">{averageScore}%</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Avg</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card">
            <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-chart-4/20">
                  <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-chart-4" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-card-foreground">{highestScore}%</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Best</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card">
            <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-chart-3/20">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-chart-3" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-card-foreground">
                    {upcomingTests.length}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Upcoming</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tests Table */}
        <Card className="bg-card">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Test History</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Complete list of all your assessments</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Test Name</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden md:table-cell">Subject</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Type</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Date</TableHead>
                      <TableHead className="text-xs sm:text-sm">Score</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Status</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {completedTests.length > 0 ? completedTests.map((test) => {
                      const submission = submissions.find(s => s.testId === test.id);
                      return (
                        <TableRow key={test.id}>
                          <TableCell className="font-medium text-xs sm:text-sm p-2 sm:p-4">
                            <div>{test.title}</div>
                            <div className="text-xs text-muted-foreground sm:hidden">
                              {new Date(test.createdAt).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm hidden md:table-cell">{test.subjectId || '-'}</TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Badge variant="outline" className="text-xs">{test.type}</Badge>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm hidden sm:table-cell">
                            {new Date(test.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </TableCell>
                          <TableCell className="p-2 sm:p-4">
                            {submission?.totalAutoScore !== undefined ? (
                              <span className={`font-semibold text-xs sm:text-sm ${getGradeColor(submission.totalAutoScore)}`}>
                                {submission.totalAutoScore}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs sm:text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge 
                              variant={submission?.status === 'graded' ? "default" : "secondary"}
                              className={`text-xs ${submission?.status === 'graded' ? "bg-chart-1/20 text-chart-1" : "bg-chart-5/20 text-chart-5"}`}
                            >
                              {submission?.status === 'graded' ? 'Graded' : 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right p-2 sm:p-4">
                            {submission?.status === 'graded' ? (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-xs h-7 sm:h-8 px-2 sm:px-3"
                                onClick={() => navigate(`/student/test/${test.id}/result`)}
                              >
                                <span className="hidden sm:inline">View Result</span>
                                <span className="sm:hidden">View</span>
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" disabled className="text-xs h-7 sm:h-8 px-2 sm:px-3">
                                <span className="hidden sm:inline">Awaiting</span>
                                <span className="sm:hidden">...</span>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    }) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 sm:py-8 text-muted-foreground text-xs sm:text-sm">
                          No test history yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AcademicHistory;
