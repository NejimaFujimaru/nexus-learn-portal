import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { ArrowLeft, Clock, CheckCircle2, Eye } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { dbOperations, Submission } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

const SubmissionsList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Teacher';
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    const unsubscribe = dbOperations.subscribeToSubmissions(setSubmissions);
    return unsubscribe;
  }, []);
  
  const pendingSubmissions = submissions.filter(s => s.status === 'pending');
  const gradedSubmissions = submissions.filter(s => s.status === 'graded');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-chart-3/20 text-chart-3">Pending Review</Badge>;
      case 'graded':
        return <Badge className="bg-chart-1/20 text-chart-1">Graded</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const SubmissionTable = ({ data }: { data: Submission[] }) => (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs sm:text-sm">Student Name</TableHead>
              <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Submitted</TableHead>
              <TableHead className="text-xs sm:text-sm">Score</TableHead>
              <TableHead className="text-xs sm:text-sm hidden md:table-cell">Status</TableHead>
              <TableHead className="text-right text-xs sm:text-sm">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((submission) => (
              <TableRow key={submission.id}>
                <TableCell className="font-medium text-xs sm:text-sm p-2 sm:p-4">
                  <div>{submission.studentName}</div>
                  <div className="text-xs text-muted-foreground sm:hidden">{formatDate(submission.submittedAt)}</div>
                </TableCell>
                <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{formatDate(submission.submittedAt)}</TableCell>
                <TableCell className="p-2 sm:p-4">
                  <span className="font-semibold text-xs sm:text-sm">{submission.totalAutoScore}</span>
                </TableCell>
                <TableCell className="hidden md:table-cell">{getStatusBadge(submission.status)}</TableCell>
                <TableCell className="text-right p-2 sm:p-4">
                  <Button 
                    size="sm" 
                    variant={submission.status === 'pending' ? 'default' : 'outline'}
                    onClick={() => navigate(`/teacher/submission/${submission.id}`)}
                    className="text-xs sm:text-sm h-8 px-2 sm:px-3"
                  >
                    <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">{submission.status === 'pending' ? 'Review' : 'View'}</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header userType="teacher" userName={userName} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link 
          to="/teacher/dashboard" 
          className="inline-flex items-center text-muted-foreground hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Student Submissions</h1>
          <p className="text-muted-foreground">Review and grade student test submissions.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="bg-card">
            <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-chart-3/20">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-chart-3" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-card-foreground">{pendingSubmissions.length}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Pending Review</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-chart-1/20">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-chart-1" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-card-foreground">{gradedSubmissions.length}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Graded</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Card className="bg-card">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">All Submissions</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Click on a submission to review student answers</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <Tabs defaultValue="pending">
              <TabsList className="mb-3 sm:mb-4 flex flex-wrap h-auto gap-1">
                <TabsTrigger value="pending" className="text-xs sm:text-sm px-2 sm:px-3">
                  Pending ({pendingSubmissions.length})
                </TabsTrigger>
                <TabsTrigger value="graded" className="text-xs sm:text-sm px-2 sm:px-3">
                  Graded ({gradedSubmissions.length})
                </TabsTrigger>
                <TabsTrigger value="all" className="text-xs sm:text-sm px-2 sm:px-3">
                  All ({submissions.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending">
                {pendingSubmissions.length > 0 ? (
                  <SubmissionTable data={pendingSubmissions} />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No pending submissions
                  </div>
                )}
              </TabsContent>

              <TabsContent value="graded">
                {gradedSubmissions.length > 0 ? (
                  <SubmissionTable data={gradedSubmissions} />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No graded submissions
                  </div>
                )}
              </TabsContent>

              <TabsContent value="all">
                {submissions.length > 0 ? (
                  <SubmissionTable data={submissions} />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No submissions yet
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SubmissionsList;
