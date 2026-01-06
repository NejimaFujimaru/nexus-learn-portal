import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ArrowLeft, Plus, Edit2, Trash2, BookOpen, FileText, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from '@/hooks/use-toast';
import { dbOperations, Subject, Chapter } from '@/lib/firebase';

const ManageSubjects = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Record<string, Chapter[]>>({});
  const [newSubjectName, setNewSubjectName] = useState('');
  const [editingSubject, setEditingSubject] = useState<string | null>(null);
  const [editSubjectName, setEditSubjectName] = useState('');
  const [newChapter, setNewChapter] = useState<{ subjectId: string; title: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = dbOperations.subscribeToSubjects((data) => {
      setSubjects(data);
      setLoading(false);
      // Load chapters for each subject
      data.forEach(async (subject) => {
        const subjectChapters = await dbOperations.getChaptersBySubject(subject.id);
        setChapters(prev => ({ ...prev, [subject.id]: subjectChapters }));
      });
    });
    return unsubscribe;
  }, []);

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return;
    try {
      await dbOperations.addSubject(newSubjectName.trim());
      setNewSubjectName('');
      toast({ title: "Subject added successfully" });
    } catch (error) {
      toast({ title: "Error adding subject", variant: "destructive" });
    }
  };

  const handleUpdateSubject = async (id: string) => {
    if (!editSubjectName.trim()) return;
    try {
      await dbOperations.updateSubject(id, editSubjectName.trim());
      setEditingSubject(null);
      toast({ title: "Subject updated successfully" });
    } catch (error) {
      toast({ title: "Error updating subject", variant: "destructive" });
    }
  };

  const handleDeleteSubject = async (id: string) => {
    try {
      await dbOperations.deleteSubject(id);
      toast({ title: "Subject deleted successfully" });
    } catch (error) {
      toast({ title: "Error deleting subject", variant: "destructive" });
    }
  };

  const handleAddChapter = async () => {
    if (!newChapter || !newChapter.title.trim()) return;
    try {
      await dbOperations.addChapter(newChapter.subjectId, newChapter.title.trim(), newChapter.content);
      const updatedChapters = await dbOperations.getChaptersBySubject(newChapter.subjectId);
      setChapters(prev => ({ ...prev, [newChapter.subjectId]: updatedChapters }));
      setNewChapter(null);
      toast({ title: "Chapter added successfully" });
    } catch (error) {
      toast({ title: "Error adding chapter", variant: "destructive" });
    }
  };

  const handleDeleteChapter = async (chapterId: string, subjectId: string) => {
    try {
      await dbOperations.deleteChapter(chapterId);
      const updatedChapters = await dbOperations.getChaptersBySubject(subjectId);
      setChapters(prev => ({ ...prev, [subjectId]: updatedChapters }));
      toast({ title: "Chapter deleted successfully" });
    } catch (error) {
      toast({ title: "Error deleting chapter", variant: "destructive" });
    }
  };

  const { user } = useAuth();
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Teacher';

  return (
    <DashboardLayout userType="teacher" userName={userName}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Manage Subjects</h1>
          <p className="text-muted-foreground">Add subjects and organize chapters within them.</p>
        </div>

        {/* Add New Subject */}
        <Card className="bg-card mb-4 sm:mb-6">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Plus className="h-5 w-5" />
              Add New Subject
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Input
                placeholder="Enter subject name..."
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddSubject()}
                className="flex-1"
              />
              <Button onClick={handleAddSubject} size="sm" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Subjects List */}
        <Card className="bg-card">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BookOpen className="h-5 w-5" />
              Subjects ({subjects.length})
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Manage your subjects and their chapters</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            {loading ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground text-sm">Loading...</div>
            ) : subjects.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground text-sm">
                No subjects yet. Add your first subject above.
              </div>
            ) : (
              <Accordion type="single" collapsible className="space-y-3 sm:space-y-4">
                {subjects.map((subject) => (
                  <AccordionItem key={subject.id} value={subject.id} className="border rounded-lg px-3 sm:px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full pr-2 sm:pr-4 gap-2">
                        {editingSubject === subject.id ? (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={editSubjectName}
                              onChange={(e) => setEditSubjectName(e.target.value)}
                              className="w-32 sm:w-48 text-sm"
                            />
                            <Button size="sm" onClick={() => handleUpdateSubject(subject.id)} className="h-8 w-8 p-0">
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingSubject(null)} className="h-8 w-8 p-0">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="font-medium text-sm sm:text-base">{subject.name}</span>
                        )}
                        <div className="flex items-center gap-1 sm:gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setEditingSubject(subject.id);
                              setEditSubjectName(subject.name);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive h-8 w-8 p-0"
                            onClick={() => handleDeleteSubject(subject.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4">
                      {/* Chapters */}
                      <div className="space-y-3">
                        {(chapters[subject.id] || []).map((chapter) => (
                          <div key={chapter.id} className="flex items-start justify-between p-3 bg-accent rounded-lg">
                            <div>
                              <p className="font-medium text-foreground flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                {chapter.title}
                              </p>
                              {chapter.content && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {chapter.content}
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => handleDeleteChapter(chapter.id, subject.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}

                        {/* Add Chapter Form */}
                        {newChapter?.subjectId === subject.id ? (
                          <div className="space-y-3 p-3 border border-border rounded-lg">
                            <div className="space-y-2">
                              <Label>Chapter Title</Label>
                              <Input
                                placeholder="Enter chapter title..."
                                value={newChapter.title}
                                onChange={(e) => setNewChapter({ ...newChapter, title: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Content (optional)</Label>
                              <Textarea
                                placeholder="Enter chapter content or description..."
                                value={newChapter.content}
                                onChange={(e) => setNewChapter({ ...newChapter, content: e.target.value })}
                                rows={3}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleAddChapter}>
                                <Save className="h-4 w-4 mr-2" />
                                Save Chapter
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setNewChapter(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => setNewChapter({ subjectId: subject.id, title: '', content: '' })}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Chapter
                          </Button>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ManageSubjects;
