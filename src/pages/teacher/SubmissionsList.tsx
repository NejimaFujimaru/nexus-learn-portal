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
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student Name</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Auto Score</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((submission) => (
            <TableRow key={submission.id}>
              <TableCell className="font-medium">{submission.studentName}</TableCell>
              <TableCell>{formatDate(submission.submittedAt)}</TableCell>
              <TableCell>
                <span className="font-semibold">{submission.totalAutoScore}</span>
              </TableCell>
              <TableCell>{getStatusBadge(submission.status)}</TableCell>
              <TableCell className="text-right">
                <Button 
                  size="sm" 
                  variant={submission.status === 'pending' ? 'default' : 'outline'}
                  onClick={() => navigate(`/teacher/submission/${submission.id}`)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  {submission.status === 'pending' ? 'Review' : 'View'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-3/20">
                  <Clock className="h-5 w-5 text-chart-3" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-card-foreground">{pendingSubmissions.length}</p>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-1/20">
                  <CheckCircle2 className="h-5 w-5 text-chart-1" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-card-foreground">{gradedSubmissions.length}</p>
                  <p className="text-sm text-muted-foreground">Graded</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>All Submissions</CardTitle>
            <CardDescription>Click on a submission to review student answers</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending">
              <TabsList className="mb-4">
                <TabsTrigger value="pending">
                  Pending ({pendingSubmissions.length})
                </TabsTrigger>
                <TabsTrigger value="graded">
                  Graded ({gradedSubmissions.length})
                </TabsTrigger>
                <TabsTrigger value="all">
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
