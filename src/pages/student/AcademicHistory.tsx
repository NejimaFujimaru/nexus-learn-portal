import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { mockTests, mockTestResults } from '@/data/mockData';
import { FileText, Trophy, TrendingUp, Calendar } from 'lucide-react';
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
  
  const completedTests = mockTests.filter(t => t.status === 'completed' || t.status === 'pending-review');
  
  const getResult = (testId: string) => mockTestResults.find(r => r.testId === testId);
  
  const getGradeColor = (percentage?: number) => {
    if (!percentage) return 'text-muted-foreground';
    if (percentage >= 90) return 'text-chart-1';
    if (percentage >= 75) return 'text-primary';
    if (percentage >= 60) return 'text-chart-3';
    if (percentage >= 40) return 'text-chart-5';
    return 'text-destructive';
  };

  const averageScore = mockTestResults.length > 0
    ? Math.round(mockTestResults.reduce((acc, r) => acc + r.percentage, 0) / mockTestResults.length)
    : 0;

  const highestScore = mockTestResults.length > 0
    ? Math.max(...mockTestResults.map(r => r.percentage))
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header userType="student" userName="Alex Thompson" />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Academic History</h1>
          <p className="text-muted-foreground">Track your learning progress and performance over time.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-card-foreground">{completedTests.length}</p>
                  <p className="text-sm text-muted-foreground">Tests Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-1/20">
                  <TrendingUp className="h-5 w-5 text-chart-1" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-card-foreground">{averageScore}%</p>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-4/20">
                  <Trophy className="h-5 w-5 text-chart-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-card-foreground">{highestScore}%</p>
                  <p className="text-sm text-muted-foreground">Highest Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-3/20">
                  <Calendar className="h-5 w-5 text-chart-3" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-card-foreground">
                    {mockTests.filter(t => t.status === 'upcoming').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Upcoming Tests</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tests Table */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Test History</CardTitle>
            <CardDescription>Complete list of all your assessments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedTests.map((test) => {
                    const result = getResult(test.id);
                    return (
                      <TableRow key={test.id}>
                        <TableCell className="font-medium">{test.name}</TableCell>
                        <TableCell>{test.subject}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{test.type}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(test.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell>
                          {result ? (
                            <span className={`font-semibold ${getGradeColor(result.percentage)}`}>
                              {result.score}/{result.totalMarks} ({result.percentage}%)
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={result ? "default" : "secondary"}
                            className={result ? "bg-chart-1/20 text-chart-1" : "bg-chart-5/20 text-chart-5"}
                          >
                            {result ? 'Graded' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {result ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/student/test/${test.id}/result`)}
                            >
                              View Result
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" disabled>
                              Awaiting Result
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AcademicHistory;
