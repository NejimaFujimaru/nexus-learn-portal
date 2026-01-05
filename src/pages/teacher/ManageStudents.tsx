import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { ArrowLeft, UserPlus, Trash2, Send, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { database, dbOperations, Test } from '@/lib/firebase';
import { ref, get, set, push, remove, onValue } from 'firebase/database';

interface Student {
  id: string;
  email: string;
  displayName: string;
  phone?: string;
  createdAt: number;
}

const ManageStudents = () => {
  const { user } = useAuth();
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Teacher';
  
  const [students, setStudents] = useState<Student[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedTest, setSelectedTest] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to students (users with role 'student')
    const usersRef = ref(database, 'users');
    const unsubUsers = onValue(usersRef, (snapshot) => {
      if (!snapshot.exists()) {
        setStudents([]);
        setLoading(false);
        return;
      }
      const data = snapshot.val();
      const studentList: Student[] = Object.entries(data)
        .filter(([_, value]: any) => value.role === 'student')
        .map(([id, value]: any) => ({
          id,
          email: value.email,
          displayName: value.displayName,
          phone: value.phone,
          createdAt: value.createdAt
        }));
      setStudents(studentList);
      setLoading(false);
    });

    // Subscribe to tests
    const unsubTests = dbOperations.subscribeToTests(setTests);

    return () => {
      unsubUsers();
      unsubTests();
    };
  }, []);

  const handleAddStudent = async () => {
    if (!newStudentEmail.trim() || !newStudentName.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    try {
      const newRef = push(ref(database, 'users'));
      await set(newRef, {
        email: newStudentEmail,
        displayName: newStudentName,
        role: 'student',
        createdAt: Date.now()
      });
      toast({ title: "Student added successfully" });
      setNewStudentEmail('');
      setNewStudentName('');
    } catch (error) {
      toast({ title: "Error adding student", variant: "destructive" });
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    try {
      await remove(ref(database, `users/${studentId}`));
      toast({ title: "Student removed" });
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    } catch (error) {
      toast({ title: "Error removing student", variant: "destructive" });
    }
  };

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(students.map(s => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleAssignTest = async () => {
    if (!selectedTest || selectedStudents.length === 0) {
      toast({ title: "Select a test and at least one student", variant: "destructive" });
      return;
    }

    try {
      // Create test assignments for selected students
      const assignmentsRef = ref(database, 'testAssignments');
      for (const studentId of selectedStudents) {
        const newRef = push(assignmentsRef);
        await set(newRef, {
          id: newRef.key,
          testId: selectedTest,
          studentId,
          assignedAt: Date.now(),
          status: 'assigned'
        });
      }
      
      toast({ title: `Test assigned to ${selectedStudents.length} student(s)` });
      setSelectedStudents([]);
      setSelectedTest('');
    } catch (error) {
      toast({ title: "Error assigning test", variant: "destructive" });
    }
  };

  const publishedTests = tests.filter(t => t.published);

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
          <h1 className="text-3xl font-bold text-foreground mb-2">Manage Students</h1>
          <p className="text-muted-foreground">Add, remove students and assign tests individually.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Add Student Card */}
          <Card className="bg-card">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <UserPlus className="h-5 w-5" />
                Add Student
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Add a new student manually</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Student Name</Label>
                <Input 
                  placeholder="John Doe" 
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Email</Label>
                <Input 
                  type="email" 
                  placeholder="student@example.com" 
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                />
              </div>
              <Button className="w-full" size="sm" onClick={handleAddStudent}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </CardContent>
          </Card>

          {/* Assign Test Card */}
          <Card className="bg-card lg:col-span-2">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Send className="h-5 w-5" />
                Assign Test
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Send a test to selected students</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Select Test</Label>
                <Select value={selectedTest} onValueChange={setSelectedTest}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a published test" />
                  </SelectTrigger>
                  <SelectContent>
                    {publishedTests.map((test) => (
                      <SelectItem key={test.id} value={test.id}>
                        {test.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {selectedStudents.length} student(s) selected
                </p>
                <Button size="sm" onClick={handleAssignTest} disabled={!selectedTest || selectedStudents.length === 0}>
                  <Send className="h-4 w-4 mr-2" />
                  Assign Test
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Students Table */}
        <Card className="bg-card mt-4 sm:mt-6">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-5 w-5" />
              All Students
              <Badge variant="secondary">{students.length}</Badge>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Select students to assign tests</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            {loading ? (
              <div className="text-center py-8 sm:py-12 text-muted-foreground">Loading...</div>
            ) : students.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-muted-foreground">
                <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No students registered yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 sm:w-12">
                          <Checkbox 
                            checked={selectedStudents.length === students.length && students.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="text-xs sm:text-sm">Name</TableHead>
                        <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Email</TableHead>
                        <TableHead className="text-xs sm:text-sm hidden md:table-cell">Joined</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="p-2 sm:p-4">
                            <Checkbox 
                              checked={selectedStudents.includes(student.id)}
                              onCheckedChange={(checked) => handleSelectStudent(student.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-xs sm:text-sm p-2 sm:p-4">
                            <div>{student.displayName}</div>
                            <div className="text-xs text-muted-foreground sm:hidden">{student.email}</div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{student.email}</TableCell>
                          <TableCell className="text-xs sm:text-sm hidden md:table-cell">
                            {new Date(student.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right p-2 sm:p-4">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-destructive hover:text-destructive h-8 w-8 p-0"
                              onClick={() => handleRemoveStudent(student.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ManageStudents;