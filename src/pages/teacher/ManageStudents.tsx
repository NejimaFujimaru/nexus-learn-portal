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

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Add Student Card */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Add Student
              </CardTitle>
              <CardDescription>Add a new student manually</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Student Name</Label>
                <Input 
                  placeholder="John Doe" 
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email" 
                  placeholder="student@example.com" 
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={handleAddStudent}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </CardContent>
          </Card>

          {/* Assign Test Card */}
          <Card className="bg-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Assign Test
              </CardTitle>
              <CardDescription>Send a test to selected students</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Test</Label>
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
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {selectedStudents.length} student(s) selected
                </p>
                <Button onClick={handleAssignTest} disabled={!selectedTest || selectedStudents.length === 0}>
                  <Send className="h-4 w-4 mr-2" />
                  Assign Test
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Students Table */}
        <Card className="bg-card mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Students
              <Badge variant="secondary">{students.length}</Badge>
            </CardTitle>
            <CardDescription>Select students to assign tests</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : students.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No students registered yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={selectedStudents.length === students.length && students.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedStudents.includes(student.id)}
                            onCheckedChange={(checked) => handleSelectStudent(student.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{student.displayName}</TableCell>
                        <TableCell>{student.email}</TableCell>
                        <TableCell>
                          {new Date(student.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-destructive hover:text-destructive"
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
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ManageStudents;