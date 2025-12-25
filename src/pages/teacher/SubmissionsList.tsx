import { useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { mockSubmissions } from '@/data/mockData';
import { ArrowLeft, Clock, CheckCircle2, Eye, Brain } from 'lucide-react';
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

const SubmissionsList = () => {
  const navigate = useNavigate();
  
  const pendingSubmissions = mockSubmissions.filter(s => s.status === 'pending');
  const reviewedSubmissions = mockSubmissions.filter(s => s.status === 'reviewed');
  const approvedSubmissions = mockSubmissions.filter(s => s.status === 'approved');

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
      case 'reviewed':
        return <Badge className="bg-chart-4/20 text-chart-4">Reviewed</Badge>;
      case 'approved':
        return <Badge className="bg-chart-1/20 text-chart-1">Approved</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const SubmissionTable = ({ submissions }: { submissions: typeof mockSubmissions }) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student Name</TableHead>
            <TableHead>Test</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>AI Score</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((submission) => (
            <TableRow key={submission.id}>
              <TableCell className="font-medium">{submission.studentName}</TableCell>
              <TableCell>{submission.testName}</TableCell>
              <TableCell>{formatDate(submission.submittedAt)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{submission.aiScore}%</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge 
                  variant="outline" 
                  className={submission.aiConfidence && submission.aiConfidence >= 85 
                    ? 'border-chart-1 text-chart-1' 
                    : 'border-chart-5 text-chart-5'
                  }
                >
                  {submission.aiConfidence}%
                </Badge>
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
      <Header userType="teacher" userName="Dr. Sarah Mitchell" />
      
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
                <div className="p-2 rounded-lg bg-chart-4/20">
                  <Eye className="h-5 w-5 text-chart-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-card-foreground">{reviewedSubmissions.length}</p>
                  <p className="text-sm text-muted-foreground">Reviewed</p>
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
                  <p className="text-2xl font-bold text-card-foreground">{approvedSubmissions.length}</p>
                  <p className="text-sm text-muted-foreground">Approved</p>
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
                <TabsTrigger value="reviewed">
                  Reviewed ({reviewedSubmissions.length})
                </TabsTrigger>
                <TabsTrigger value="approved">
                  Approved ({approvedSubmissions.length})
                </TabsTrigger>
                <TabsTrigger value="all">
                  All ({mockSubmissions.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending">
                {pendingSubmissions.length > 0 ? (
                  <SubmissionTable submissions={pendingSubmissions} />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No pending submissions
                  </div>
                )}
              </TabsContent>

              <TabsContent value="reviewed">
                {reviewedSubmissions.length > 0 ? (
                  <SubmissionTable submissions={reviewedSubmissions} />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No reviewed submissions
                  </div>
                )}
              </TabsContent>

              <TabsContent value="approved">
                {approvedSubmissions.length > 0 ? (
                  <SubmissionTable submissions={approvedSubmissions} />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No approved submissions
                  </div>
                )}
              </TabsContent>

              <TabsContent value="all">
                <SubmissionTable submissions={mockSubmissions} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SubmissionsList;
