import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { ArrowLeft, Save, Plus, Calendar, Clock, FileText, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

const CreateTest = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [type, setType] = useState('');
  const [subject, setSubject] = useState('');
  const [duration, setDuration] = useState('');
  const [date, setDate] = useState('');
  const [chapters, setChapters] = useState<string[]>([]);
  const [newChapter, setNewChapter] = useState('');

  const addChapter = () => {
    if (newChapter.trim() && !chapters.includes(newChapter.trim())) {
      setChapters([...chapters, newChapter.trim()]);
      setNewChapter('');
    }
  };

  const removeChapter = (chapter: string) => {
    setChapters(chapters.filter(c => c !== chapter));
  };

  const handleSave = () => {
    toast({
      title: "Test Created (Demo)",
      description: "This is a demo. In a real app, the test would be saved to the database.",
    });
    navigate('/teacher/question-builder');
  };

  const handlePublish = () => {
    toast({
      title: "Test Published (Demo)",
      description: "This is a demo. In a real app, the test would be published for students.",
    });
    navigate('/teacher/dashboard');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header userType="teacher" userName="Dr. Sarah Mitchell" />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link 
          to="/teacher/dashboard" 
          className="inline-flex items-center text-muted-foreground hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-2xl">Create New Test</CardTitle>
            <CardDescription>
              Set up a new assessment for your students
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Test Title
              </Label>
              <Input
                id="title"
                placeholder="e.g., Mathematics Unit Test 1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Type */}
              <div className="space-y-2">
                <Label>Test Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select test type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="mid-term">Mid-Term</SelectItem>
                    <SelectItem value="final">Final Exam</SelectItem>
                    <SelectItem value="practice">Practice Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Subject
                </Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mathematics">Mathematics</SelectItem>
                    <SelectItem value="physics">Physics</SelectItem>
                    <SelectItem value="chemistry">Chemistry</SelectItem>
                    <SelectItem value="biology">Biology</SelectItem>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="history">History</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Duration (minutes)
                </Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="e.g., 60"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Scheduled Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            {/* Chapters */}
            <div className="space-y-2">
              <Label>Chapters Covered</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a chapter..."
                  value={newChapter}
                  onChange={(e) => setNewChapter(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addChapter()}
                />
                <Button type="button" variant="outline" onClick={addChapter}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {chapters.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {chapters.map((chapter) => (
                    <Badge 
                      key={chapter} 
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      onClick={() => removeChapter(chapter)}
                    >
                      {chapter} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleSave}
              >
                <Save className="h-4 w-4 mr-2" />
                Save & Add Questions
              </Button>
              <Button 
                className="flex-1"
                onClick={handlePublish}
              >
                Publish Test (Demo)
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CreateTest;
