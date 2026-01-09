import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { GraduationCap, Plus, Users, BookOpen, MoreVertical, Edit, Archive, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { database, dbOperations, Subject } from '@/lib/firebase';
import { ref, push, set, onValue, remove, update } from 'firebase/database';

interface ClassData {
  id: string;
  name: string;
  subjectId: string;
  subjectName: string;
  description: string;
  teacherId: string;
  teacherName: string;
  studentCount: number;
  students: string[];
  archived: boolean;
  createdAt: number;
}

const ManageClasses = () => {
  const { user } = useAuth();
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Teacher';
  
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassData | null>(null);
  
  // Form state
  const [className, setClassName] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const classesRef = ref(database, 'classes');
    const unsubClasses = onValue(classesRef, (snapshot) => {
      if (!snapshot.exists()) {
        setClasses([]);
        setLoading(false);
        return;
      }
      const data = snapshot.val();
      const classList: ClassData[] = Object.entries(data)
        .filter(([_, value]: any) => !value.archived)
        .map(([id, value]: any) => ({
          id,
          ...value,
          students: value.students || [],
          studentCount: value.students ? Object.keys(value.students).length : 0
        }));
      setClasses(classList);
      setLoading(false);
    });

    const unsubSubjects = dbOperations.subscribeToSubjects(setSubjects);

    return () => {
      unsubClasses();
      unsubSubjects();
    };
  }, []);

  const resetForm = () => {
    setClassName('');
    setSelectedSubject('');
    setDescription('');
    setEditingClass(null);
  };

  const handleOpenDialog = (classItem?: ClassData) => {
    if (classItem) {
      setEditingClass(classItem);
      setClassName(classItem.name);
      setSelectedSubject(classItem.subjectId);
      setDescription(classItem.description);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSaveClass = async () => {
    if (!className.trim() || !selectedSubject) {
      toast({ title: 'Please fill in required fields', variant: 'destructive' });
      return;
    }

    const subjectData = subjects.find(s => s.id === selectedSubject);
    
    try {
      if (editingClass) {
        await update(ref(database, `classes/${editingClass.id}`), {
          name: className,
          subjectId: selectedSubject,
          subjectName: subjectData?.name || '',
          description
        });
        toast({ title: 'Class updated successfully' });
      } else {
        const newRef = push(ref(database, 'classes'));
        await set(newRef, {
          id: newRef.key,
          name: className,
          subjectId: selectedSubject,
          subjectName: subjectData?.name || '',
          description,
          teacherId: user?.uid,
          teacherName: userName,
          students: {},
          archived: false,
          createdAt: Date.now()
        });
        toast({ title: 'Class created successfully' });
      }
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({ title: 'Error saving class', variant: 'destructive' });
    }
  };

  const handleArchiveClass = async (classId: string) => {
    try {
      await update(ref(database, `classes/${classId}`), { archived: true });
      toast({ title: 'Class archived' });
    } catch (error) {
      toast({ title: 'Error archiving class', variant: 'destructive' });
    }
  };

  const handleDeleteClass = async (classId: string) => {
    try {
      await remove(ref(database, `classes/${classId}`));
      toast({ title: 'Class deleted' });
    } catch (error) {
      toast({ title: 'Error deleting class', variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout userType="teacher" userName={userName}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Manage Classes</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Create and manage your classes</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Class
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md">
              <DialogHeader>
                <DialogTitle>{editingClass ? 'Edit Class' : 'Create New Class'}</DialogTitle>
                <DialogDescription>
                  {editingClass ? 'Update class details' : 'Add a new class for your students'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Class Name *</Label>
                  <Input
                    placeholder="e.g., Grade 10 - Section A"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subject *</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Optional class description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveClass}>
                  {editingClass ? 'Update' : 'Create'} Class
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Classes Grid */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading classes...</div>
        ) : classes.length === 0 ? (
          <Card className="bg-card">
            <CardContent className="py-12 text-center">
              <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">No classes created yet</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Class
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((classItem) => (
              <Card key={classItem.id} className="bg-card hover:shadow-md transition-shadow">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg truncate">{classItem.name}</CardTitle>
                      <CardDescription className="text-xs sm:text-sm mt-1">
                        {classItem.subjectName}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(classItem)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleArchiveClass(classItem.id)}>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteClass(classItem.id)}
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
                  {classItem.description && (
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-2">
                      {classItem.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{classItem.studentCount} students</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      <BookOpen className="h-3 w-3 mr-1" />
                      {classItem.subjectName}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Teacher: {classItem.teacherName}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManageClasses;
