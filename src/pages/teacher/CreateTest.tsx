import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { ArrowLeft, Save, Plus, Clock, FileText, BookOpen, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/hooks/use-toast';
import { dbOperations, Subject, Chapter, Question } from '@/lib/firebase';

interface LocalQuestion {
  type: 'mcq' | 'fillBlank' | 'shortAnswer';
  text: string;
  options: string[];
  correctAnswer: string | number;
  marks: number;
}

const CreateTest = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'weekly' | 'monthly' | 'quiz' | 'final'>('quiz');
  const [subjectId, setSubjectId] = useState('');
  const [duration, setDuration] = useState('');
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  
  // New question form
  const [questionType, setQuestionType] = useState<'mcq' | 'fillBlank' | 'shortAnswer'>('mcq');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctOption, setCorrectOption] = useState<number>(0);
  const [fillBlankAnswer, setFillBlankAnswer] = useState('');
  const [questionMarks, setQuestionMarks] = useState('1');

  useEffect(() => {
    const unsubscribe = dbOperations.subscribeToSubjects(setSubjects);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (subjectId) {
      dbOperations.getChaptersBySubject(subjectId).then(setChapters);
    } else {
      setChapters([]);
    }
  }, [subjectId]);

  const toggleChapter = (chapterId: string) => {
    setSelectedChapters(prev => 
      prev.includes(chapterId) 
        ? prev.filter(c => c !== chapterId)
        : [...prev, chapterId]
    );
  };

  const addQuestion = () => {
    if (!questionText.trim()) {
      toast({ title: "Please enter question text", variant: "destructive" });
      return;
    }

    const newQuestion: LocalQuestion = {
      type: questionType,
      text: questionText,
      options: questionType === 'mcq' ? options.filter(o => o.trim()) : [],
      correctAnswer: questionType === 'mcq' ? correctOption : 
                     questionType === 'fillBlank' ? fillBlankAnswer : '',
      marks: parseInt(questionMarks) || 1
    };

    if (questionType === 'mcq' && newQuestion.options.length < 2) {
      toast({ title: "MCQ needs at least 2 options", variant: "destructive" });
      return;
    }

    if (questionType === 'fillBlank' && !fillBlankAnswer.trim()) {
      toast({ title: "Please enter the correct answer", variant: "destructive" });
      return;
    }

    setQuestions([...questions, newQuestion]);
    // Reset form
    setQuestionText('');
    setOptions(['', '', '', '']);
    setCorrectOption(0);
    setFillBlankAnswer('');
    setQuestionMarks('1');
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handlePublish = async () => {
    if (!title.trim() || !subjectId || !duration || questions.length === 0) {
      toast({ 
        title: "Please fill all required fields", 
        description: "Title, subject, duration, and at least one question are required",
        variant: "destructive" 
      });
      return;
    }

    try {
      const testId = await dbOperations.addTest({
        title,
        subjectId,
        chapterIds: selectedChapters,
        duration: parseInt(duration),
        type,
        published: true
      });

      // Add questions
      for (const q of questions) {
        await dbOperations.addQuestion({
          testId,
          type: q.type,
          text: q.text,
          options: q.options,
          correctAnswer: q.correctAnswer,
          marks: q.marks
        });
      }

      toast({ title: "Test published successfully!" });
      navigate('/teacher/dashboard');
    } catch (error) {
      toast({ title: "Error creating test", variant: "destructive" });
    }
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

        <Card className="bg-card mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">Create New Test</CardTitle>
            <CardDescription>Set up a new assessment for your students</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Test Title *
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
                <Label>Test Type *</Label>
                <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select test type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="weekly">Weekly Test</SelectItem>
                    <SelectItem value="monthly">Monthly Test</SelectItem>
                    <SelectItem value="final">Final Exam</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Subject *
                </Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
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

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Duration (minutes) *
                </Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="e.g., 60"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
            </div>

            {/* Chapters */}
            {chapters.length > 0 && (
              <div className="space-y-2">
                <Label>Chapters Covered</Label>
                <div className="flex flex-wrap gap-2">
                  {chapters.map((chapter) => (
                    <Badge
                      key={chapter.id}
                      variant={selectedChapters.includes(chapter.id) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleChapter(chapter.id)}
                    >
                      {chapter.title}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Question Builder */}
        <Card className="bg-card mb-6">
          <CardHeader>
            <CardTitle>Add Questions</CardTitle>
            <CardDescription>Create MCQs, Fill-in-the-blanks, or Short Answer questions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Question Type */}
            <div className="space-y-2">
              <Label>Question Type</Label>
              <Select value={questionType} onValueChange={(v) => setQuestionType(v as typeof questionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">Multiple Choice (MCQ)</SelectItem>
                  <SelectItem value="fillBlank">Fill in the Blank</SelectItem>
                  <SelectItem value="shortAnswer">Short Answer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Question Text */}
            <div className="space-y-2">
              <Label>Question Text</Label>
              <Textarea
                placeholder="Enter your question here..."
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                rows={2}
              />
            </div>

            {/* MCQ Options */}
            {questionType === 'mcq' && (
              <div className="space-y-3">
                <Label>Options (select correct answer)</Label>
                <RadioGroup value={correctOption.toString()} onValueChange={(v) => setCorrectOption(parseInt(v))}>
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <RadioGroupItem value={index.toString()} id={`opt-${index}`} />
                      <Input
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...options];
                          newOptions[index] = e.target.value;
                          setOptions(newOptions);
                        }}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Fill Blank Answer */}
            {questionType === 'fillBlank' && (
              <div className="space-y-2">
                <Label>Correct Answer</Label>
                <Input
                  placeholder="Enter the correct answer..."
                  value={fillBlankAnswer}
                  onChange={(e) => setFillBlankAnswer(e.target.value)}
                />
              </div>
            )}

            {questionType === 'shortAnswer' && (
              <p className="text-sm text-muted-foreground">
                Short answer questions will be saved for teacher review. No auto-grading.
              </p>
            )}

            {/* Marks */}
            <div className="space-y-2">
              <Label>Marks</Label>
              <Input
                type="number"
                placeholder="1"
                value={questionMarks}
                onChange={(e) => setQuestionMarks(e.target.value)}
                className="w-24"
              />
            </div>

            <Button onClick={addQuestion}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </CardContent>
        </Card>

        {/* Questions List */}
        {questions.length > 0 && (
          <Card className="bg-card mb-6">
            <CardHeader>
              <CardTitle>Questions ({questions.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {questions.map((q, index) => (
                <div key={index} className="flex items-start justify-between p-3 bg-accent rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">{q.type.toUpperCase()}</Badge>
                      <span className="text-xs text-muted-foreground">{q.marks} mark(s)</span>
                    </div>
                    <p className="text-foreground">{q.text}</p>
                    {q.type === 'mcq' && (
                      <div className="text-sm text-muted-foreground mt-1">
                        Options: {q.options.join(', ')} | Correct: Option {(q.correctAnswer as number) + 1}
                      </div>
                    )}
                    {q.type === 'fillBlank' && (
                      <div className="text-sm text-muted-foreground mt-1">
                        Answer: {q.correctAnswer}
                      </div>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeQuestion(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Publish Button */}
        <div className="flex gap-3">
          <Button size="lg" onClick={handlePublish} disabled={questions.length === 0}>
            <Save className="h-4 w-4 mr-2" />
            Publish Test
          </Button>
        </div>
      </main>
    </div>
  );
};

export default CreateTest;
