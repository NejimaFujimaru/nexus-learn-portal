import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { FileText, Plus, Eye, ClipboardList, MoreVertical, Edit, Archive, Trash2, Send, ArchiveRestore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { database, dbOperations, Test, Submission } from '@/lib/firebase';
import { ref, update, remove, onValue } from 'firebase/database';

const ManageTests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Teacher';
  
  const [tests, setTests] = useState<Test[]>([]);
  const [archivedTests, setArchivedTests] = useState<Test[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testsRef = ref(database, 'tests');
    const unsubTests = onValue(testsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setTests([]);
        setArchivedTests([]);
        setLoading(false);
        return;
      }
      const data = snapshot.val();
      const allTests: Test[] = Object.values(data);
      setTests(allTests.filter((t: any) => !t.archived));
      setArchivedTests(allTests.filter((t: any) => t.archived));
      setLoading(false);
    });

    const unsubSubmissions = dbOperations.subscribeToSubmissions(setSubmissions);

    return () => {
      unsubTests();
      unsubSubmissions();
    };
  }, []);

  const getSubmissionCount = (testId: string) => {
    return submissions.filter(s => s.testId === testId).length;
  };

  const testsWithSubmissions = tests.filter(t => getSubmissionCount(t.id) > 0);
  const totalSubmissions = submissions.length;

  const handlePublishToggle = async (test: Test) => {
    try {
      await update(ref(database, `tests/${test.id}`), { published: !test.published });
      toast({ title: test.published ? 'Test unpublished' : 'Test published' });
    } catch (error) {
      toast({ title: 'Error updating test', variant: 'destructive' });
    }
  };

  const handleArchive = async (testId: string) => {
    try {
      await update(ref(database, `tests/${testId}`), { archived: true });
      toast({ title: 'Test archived' });
    } catch (error) {
      toast({ title: 'Error archiving test', variant: 'destructive' });
    }
  };

  const handleRestore = async (testId: string) => {
    try {
      await update(ref(database, `tests/${testId}`), { archived: false });
      toast({ title: 'Test restored' });
    } catch (error) {
      toast({ title: 'Error restoring test', variant: 'destructive' });
    }
  };

  const handleDelete = async (testId: string) => {
    try {
      await remove(ref(database, `tests/${testId}`));
      toast({ title: 'Test deleted' });
    } catch (error) {
      toast({ title: 'Error deleting test', variant: 'destructive' });
    }
  };

  // Stats cards
  const stats = [
    { icon: FileText, label: 'Total Tests', value: tests.length, color: 'text-primary' },
    { icon: ClipboardList, label: 'Total Submissions', value: totalSubmissions, color: 'text-chart-1' },
    { icon: Eye, label: 'Tests with Submissions', value: testsWithSubmissions.length, color: 'text-chart-2' },
  ];

  const TestCard = ({ test, isArchived = false }: { test: Test; isArchived?: boolean }) => (
    <Card className="bg-card hover:shadow-md transition-shadow">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base sm:text-lg truncate">{test.title}</CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              {test.subjectName || 'No subject'} • {test.duration} min
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isArchived && (
                <>
                  <DropdownMenuItem onClick={() => navigate('/teacher/create-test')}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePublishToggle(test)}>
                    <Send className="h-4 w-4 mr-2" />
                    {test.published ? 'Unpublish' : 'Publish'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleArchive(test.id)}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                </>
              )}
              {isArchived && (
                <DropdownMenuItem onClick={() => handleRestore(test.id)}>
                  <ArchiveRestore className="h-4 w-4 mr-2" />
                  Restore
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => handleDelete(test.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge variant="outline" className="text-xs">{test.type}</Badge>
          <Badge 
            variant="secondary"
            className={`text-xs ${test.published 
              ? 'bg-chart-1/20 text-chart-1' 
              : 'bg-chart-3/20 text-chart-3'
            }`}
          >
            {test.published ? 'Published' : 'Draft'}
          </Badge>
          {isArchived && (
            <Badge variant="secondary" className="text-xs bg-muted">
              Archived
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
          <span>{getSubmissionCount(test.id)} submissions</span>
          <span>{new Date(test.createdAt).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout userType="teacher" userName={userName}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Test Management</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Create, manage and track your tests</p>
          </div>
          <Button onClick={() => navigate('/teacher/create-test')} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Create Test
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-card">
              <CardContent className="p-3 sm:p-4 sm:pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 w-fit">
                    <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-lg sm:text-2xl font-bold text-card-foreground">{stat.value}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="manage" className="space-y-4 sm:space-y-6">
          <TabsList className="bg-muted w-full sm:w-auto grid grid-cols-3 sm:flex">
            <TabsTrigger value="create" className="text-xs sm:text-sm">Create</TabsTrigger>
            <TabsTrigger value="manage" className="text-xs sm:text-sm">Manage</TabsTrigger>
            <TabsTrigger value="results" className="text-xs sm:text-sm">Results</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <Card className="bg-card">
              <CardContent className="py-8 sm:py-12 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Create a New Test</h3>
                <p className="text-muted-foreground mb-4 text-sm">Use our test creation wizard to build your assessment</p>
                <Button onClick={() => navigate('/teacher/create-test')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Start Creating
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading tests...</div>
            ) : tests.length === 0 && archivedTests.length === 0 ? (
              <Card className="bg-card">
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-4">No tests created yet</p>
                  <Button onClick={() => navigate('/teacher/create-test')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Test
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Active Tests */}
                {tests.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Active Tests ({tests.length})</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {tests.map((test) => (
                        <TestCard key={test.id} test={test} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Archived Tests */}
                {archivedTests.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-muted-foreground">
                      Archived Tests ({archivedTests.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75">
                      {archivedTests.map((test) => (
                        <TestCard key={test.id} test={test} isArchived />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="results">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  View Submissions
                </CardTitle>
                <CardDescription>Review and grade student submissions</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/teacher/submissions')} className="w-full sm:w-auto">
                  <Eye className="h-4 w-4 mr-2" />
                  Go to Submissions
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ManageTests;
