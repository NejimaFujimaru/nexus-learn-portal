import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  GraduationCap, 
  UserPlus, 
  Clock, 
  CheckCircle, 
  XCircle,
  BookOpen,
  Users,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { database } from '@/lib/firebase';
import { ref, push, set, onValue, get } from 'firebase/database';

interface ClassData {
  id: string;
  name: string;
  subjectName: string;
  teacherName: string;
  description: string;
  studentCount: number;
}

interface ClassRequest {
  id: string;
  classId: string;
  className: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

const StudentClass = () => {
  const { user } = useAuth();
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Student';
  const studentId = user?.uid || '';
  
  const [enrolledClass, setEnrolledClass] = useState<ClassData | null>(null);
  const [requests, setRequests] = useState<ClassRequest[]>([]);
  const [classCode, setClassCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!studentId) return;

    // Check for enrolled class
    const enrollmentsRef = ref(database, 'classEnrollments');
    const unsubEnrollments = onValue(enrollmentsRef, async (snapshot) => {
      if (!snapshot.exists()) {
        setEnrolledClass(null);
        setLoading(false);
        return;
      }
      
      const data = snapshot.val();
      const myEnrollment = Object.values(data).find((e: any) => 
        e.studentId === studentId && e.status === 'approved'
      ) as any;
      
      if (myEnrollment) {
        // Fetch class details
        const classSnap = await get(ref(database, `classes/${myEnrollment.classId}`));
        if (classSnap.exists()) {
          const classData = classSnap.val();
          setEnrolledClass({
            id: myEnrollment.classId,
            name: classData.name,
            subjectName: classData.subjectName,
            teacherName: classData.teacherName,
            description: classData.description,
            studentCount: classData.students ? Object.keys(classData.students).length : 0
          });
        }
      } else {
        setEnrolledClass(null);
      }
      setLoading(false);
    });

    // Get class requests
    const requestsRef = ref(database, 'classRequests');
    const unsubRequests = onValue(requestsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setRequests([]);
        return;
      }
      const data = snapshot.val();
      const myRequests: ClassRequest[] = Object.entries(data)
        .filter(([_, value]: any) => value.studentId === studentId)
        .map(([id, value]: any) => ({
          id,
          classId: value.classId,
          className: value.className,
          status: value.status,
          createdAt: value.createdAt
        }));
      setRequests(myRequests);
    });

    return () => {
      unsubEnrollments();
      unsubRequests();
    };
  }, [studentId]);

  const handleJoinClass = async () => {
    if (!classCode.trim()) {
      toast({ title: 'Please enter a class code', variant: 'destructive' });
      return;
    }

    setJoining(true);
    try {
      // Look up class by code (using class ID as code for simplicity)
      const classSnap = await get(ref(database, `classes/${classCode.trim()}`));
      
      if (!classSnap.exists()) {
        toast({ title: 'Class not found', description: 'Please check the code and try again', variant: 'destructive' });
        setJoining(false);
        return;
      }

      const classData = classSnap.val();

      // Check if already requested
      const existingRequest = requests.find(r => r.classId === classCode.trim());
      if (existingRequest) {
        toast({ title: 'Request already sent', description: 'You have already requested to join this class', variant: 'destructive' });
        setJoining(false);
        return;
      }

      // Create join request
      const newRef = push(ref(database, 'classRequests'));
      await set(newRef, {
        id: newRef.key,
        classId: classCode.trim(),
        className: classData.name,
        studentId,
        studentName: userName,
        studentEmail: user?.email,
        status: 'pending',
        createdAt: Date.now()
      });

      toast({ title: 'Request sent!', description: 'Your teacher will review your request' });
      setClassCode('');
    } catch (error) {
      toast({ title: 'Error joining class', variant: 'destructive' });
    } finally {
      setJoining(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-chart-1" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-chart-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-chart-1/20 text-chart-1';
      case 'rejected':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-chart-3/20 text-chart-3';
    }
  };

  return (
    <DashboardLayout userType="student" userName={userName}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">My Class</h1>
          <p className="text-muted-foreground text-sm sm:text-base">View your enrolled class or join a new one</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : enrolledClass ? (
          /* Enrolled Class Display */
          <Card className="bg-card mb-6">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <GraduationCap className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl sm:text-2xl">{enrolledClass.name}</CardTitle>
                  <CardDescription className="mt-1">{enrolledClass.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-2 p-3 bg-accent rounded-lg">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{enrolledClass.subjectName}</p>
                    <p className="text-xs text-muted-foreground">Subject</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-accent rounded-lg">
                  <Users className="h-5 w-5 text-chart-2" />
                  <div>
                    <p className="text-sm font-medium">{enrolledClass.studentCount} Students</p>
                    <p className="text-xs text-muted-foreground">Class Size</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-accent rounded-lg">
                  <GraduationCap className="h-5 w-5 text-chart-1" />
                  <div>
                    <p className="text-sm font-medium">{enrolledClass.teacherName}</p>
                    <p className="text-xs text-muted-foreground">Teacher</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Join Class Form */
          <Card className="bg-card mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Join a Class
              </CardTitle>
              <CardDescription>
                Enter the class code provided by your teacher to request access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="classCode">Class Code</Label>
                  <Input
                    id="classCode"
                    placeholder="Enter class code..."
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value)}
                  />
                </div>
                <div className="sm:self-end">
                  <Button 
                    onClick={handleJoinClass} 
                    disabled={joining || !classCode.trim()}
                    className="w-full sm:w-auto"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {joining ? 'Sending...' : 'Request to Join'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Request Status */}
        {requests.length > 0 && (
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Clock className="h-5 w-5" />
                My Requests
              </CardTitle>
              <CardDescription>Status of your class join requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {requests.map((request) => (
                  <div 
                    key={request.id}
                    className="flex items-center justify-between p-3 bg-accent rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(request.status)}
                      <div>
                        <p className="font-medium text-sm">{request.className}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge className={`text-xs ${getStatusColor(request.status)}`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentClass;
