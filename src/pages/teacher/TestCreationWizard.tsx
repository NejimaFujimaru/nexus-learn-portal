import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  ArrowLeft, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  ChevronDown, 
  ChevronUp,
  GripVertical,
  FileText,
  ListChecks,
  HelpCircle,
  Loader2,
  Eye
} from 'lucide-react';
import { AIQuestionGenerator } from '@/components/teacher/AIQuestionGenerator';
import { getSubjects, database, dbOperations } from '@/lib/firebase';
import { ref, get, push, set } from 'firebase/database';
import { toast } from '@/hooks/use-toast';

interface Question {
  id: string;
  type: 'mcq' | 'blank' | 'short' | 'long';
  text: string;
  options?: string[];
  correctAnswer?: string;
  marks: number;
}

interface Subject {
  id: string;
  name: string;
}

interface Chapter {
  id: string;
  subjectId: string;
  title: string;
  content: string;
}

const TestCreationWizard = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  // Step 1: Test Details
  const [testTitle, setTestTitle] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [subjectChapters, setSubjectChapters] = useState<Chapter[]>([]);
  const [testType, setTestType] = useState<'weekly' | 'monthly'>('weekly');
  const [duration, setDuration] = useState(30);
  const [totalMarks, setTotalMarks] = useState(100);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  // Step 2: Questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<string[]>([]);
  
  // New question form
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    type: 'mcq',
    text: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    marks: 1
  });

  useEffect(() => {
    loadSubjects();
  }, []);

  // Fetch chapters when subject changes (Realtime Database)
  useEffect(() => {
    if (!selectedSubject) {
      setSubjectChapters([]);
      setSelectedChapters([]);
      return;
    }

    const fetchChapters = async () => {
      try {
        console.log('Fetching chapters for subject:', selectedSubject);

        // Prefer chapters embedded in the selected subject (subjects/{id}/chapters)
        const subjectPath = `subjects/${selectedSubject}`;
        const subjectSnap = await get(ref(database, subjectPath));
        const subjectVal = subjectSnap.exists() ? subjectSnap.val() : null;
        console.log('Subject snapshot:', subjectPath, subjectVal);

        if (subjectVal?.chapters) {
          const raw = subjectVal.chapters;
          const chapters: Chapter[] = Array.isArray(raw)
            ? raw
                .filter(Boolean)
                .map((c: any, idx: number) => ({
                  id: c?.id ?? `${idx}`,
                  subjectId: c?.subjectId ?? selectedSubject,
                  title: c?.title ?? 'Untitled Chapter',
                  content: c?.content ?? ''
                }))
            : Object.entries(raw).map(([key, val]: any) => ({
                id: val?.id ?? key,
                subjectId: val?.subjectId ?? selectedSubject,
                title: val?.title ?? 'Untitled Chapter',
                content: val?.content ?? ''
              }));

          setSubjectChapters(chapters);
          return;
        }

        // Fallback to global chapters collection
        const chapters = await dbOperations.getChaptersBySubject(selectedSubject);
        setSubjectChapters(chapters as unknown as Chapter[]);
      } catch (error) {
        console.error('Error fetching chapters:', error);
        setSubjectChapters([]);
      }
    };

    fetchChapters();
    setSelectedChapters([]); // Reset selected chapters when subject changes
  }, [selectedSubject]);

  const loadSubjects = async () => {
    try {
      const data = await getSubjects();
      setSubjects(data as Subject[]);
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const selectedSubjectData = subjects.find(s => s.id === selectedSubject);
  const hasChapters = subjectChapters.length > 0;
  // Progress: 0% at step 1, 50% at step 2, 100% at step 3
  const progressPercentage = ((currentStep - 1) / 2) * 100;

  const validateStep1 = () => {
    if (!testTitle.trim()) {
      toast({ title: 'Error', description: 'Please enter a test title', variant: 'destructive' });
      return false;
    }
    if (!selectedSubject) {
      toast({ title: 'Error', description: 'Please select a subject', variant: 'destructive' });
      return false;
    }
    // Only validate chapters if the selected subject has chapters
    if (hasChapters && selectedChapters.length === 0) {
      toast({ title: 'Error', description: 'Please select at least one chapter', variant: 'destructive' });
      return false;
    }
    if (duration < 5) {
      toast({ title: 'Error', description: 'Duration must be at least 5 minutes', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (questions.length === 0) {
      toast({ title: 'Error', description: 'Please add at least one question', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
      toast({ title: 'Step 1 Complete', description: 'Test details saved!' });
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
      toast({ title: 'Step 2 Complete', description: 'Questions saved!' });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const addQuestion = () => {
    if (!newQuestion.text?.trim()) {
      toast({ title: 'Error', description: 'Please enter question text', variant: 'destructive' });
      return;
    }

    if (newQuestion.type === 'mcq') {
      if (!newQuestion.options?.every(opt => opt.trim())) {
        toast({ title: 'Error', description: 'Please fill all options', variant: 'destructive' });
        return;
      }
      if (!newQuestion.correctAnswer) {
        toast({ title: 'Error', description: 'Please select the correct answer', variant: 'destructive' });
        return;
      }
    }

    if (newQuestion.type === 'blank' && !newQuestion.correctAnswer?.trim()) {
      toast({ title: 'Error', description: 'Please enter the correct answer', variant: 'destructive' });
      return;
    }

    const question: Question = {
      id: Date.now().toString(),
      type: newQuestion.type as 'mcq' | 'blank' | 'short',
      text: newQuestion.text || '',
      options: newQuestion.type === 'mcq' ? newQuestion.options : undefined,
      correctAnswer: newQuestion.type !== 'short' ? newQuestion.correctAnswer : undefined,
      marks: newQuestion.marks || 1
    };

    setQuestions([...questions, question]);
    setNewQuestion({
      type: 'mcq',
      text: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      marks: 1
    });
    
    toast({ title: 'Question Added', description: `Question ${questions.length + 1} added successfully!` });
  };

  const addGeneratedQuestions = (generatedQuestions: Question[]) => {
    setQuestions(prev => [...prev, ...generatedQuestions]);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
    toast({ title: 'Question Removed', description: 'Question removed from test' });
  };

  const clearAllQuestions = () => {
    if (questions.length === 0) return;
    setQuestions([]);
    setExpandedQuestions([]);
    toast({ title: 'All Questions Removed', description: 'All questions have been cleared from this test.' });
  };

  const toggleExpanded = (id: string) => {
    setExpandedQuestions(prev => 
      prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id]
    );
  };

  const handleChapterToggle = (chapterId: string) => {
    setSelectedChapters(prev =>
      prev.includes(chapterId)
        ? prev.filter(id => id !== chapterId)
        : [...prev, chapterId]
    );
  };

  const handlePublish = async () => {
    setLoading(true);
    try {
      // Create test id first
      const testRef = push(ref(database, 'tests'));
      const testId = testRef.key as string;

      const testData = {
        id: testId,
        title: testTitle,
        subjectId: selectedSubject,
        subjectName: selectedSubjectData?.name || '',
        chapterIds: selectedChapters,
        type: testType,
        duration,
        totalMarks,
        difficulty,
        specialInstructions,
        published: true,
        createdAt: new Date().toISOString(),
      };

      console.log('Saving to:', `tests/${testId}`, testData);
      await set(testRef, testData);

      // Map question types and save each question with testId reference
      const questionsToSave = questions.map(q => {
        // Map 'blank' to 'fillBlank', 'short' to 'shortAnswer', and 'long' to 'longAnswer' for Firebase types
        const mappedType = q.type === 'blank' ? 'fillBlank' : q.type === 'short' ? 'shortAnswer' : q.type === 'long' ? 'longAnswer' : 'mcq';
        return {
          id: q.id,
          testId: testId,
          type: mappedType,
          text: q.text,
          marks: q.marks,
          // Only include options for MCQ, and ensure they are valid strings
          ...(mappedType === 'mcq' && q.options ? { options: q.options.filter(o => o && o.trim()) } : {}),
          // Include correctAnswer for mcq and fillBlank
          ...(mappedType !== 'shortAnswer' && mappedType !== 'longAnswer' && q.correctAnswer !== undefined ? { correctAnswer: q.correctAnswer } : {})
        };
      });

      // Save questions to global questions collection with individual keys
      for (const question of questionsToSave) {
        const qRef = push(ref(database, 'questions'));
        await set(qRef, { ...question, id: qRef.key });
      }

      toast({ title: 'Success!', description: 'Test published successfully!' });
      navigate('/teacher/dashboard');
    } catch (error) {
      console.error('Publish failed:', error);
      toast({ title: 'Error', description: 'Failed to save. Check database connection.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const totalQuestionMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  return (
    <div className="min-h-screen bg-muted/30 p-3 sm:p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <Button variant="ghost" onClick={() => navigate('/teacher/dashboard')} className="mb-2 sm:mb-4 -ml-2 text-xs sm:text-sm">
            <ArrowLeft className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-xl sm:text-2xl font-bold">Create New Test</h1>
          <p className="text-sm text-muted-foreground">Step {currentStep} of 3</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6 sm:mb-8">
          <Progress value={currentStep === 3 ? 100 : progressPercentage} className="h-2" />
          <div className="flex justify-between mt-2 text-xs sm:text-sm gap-1">
            <span className={`text-center flex-1 ${currentStep >= 1 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              <span className="hidden sm:inline">1. </span>Test Details
            </span>
            <span className={`text-center flex-1 ${currentStep >= 2 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              <span className="hidden sm:inline">2. </span>Questions
            </span>
            <span className={`text-center flex-1 ${currentStep >= 3 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              <span className="hidden sm:inline">3. </span>Review
            </span>
          </div>
        </div>

        {/* Question Counter */}
        {currentStep === 2 && (
          <Alert className="mb-4">
            <ListChecks className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">{questions.length} questions</span> added | 
              Total marks: <span className="font-medium">{totalQuestionMarks}</span>
            </AlertDescription>
          </Alert>
        )}

        {/* Step 1: Test Details */}
        {currentStep === 1 && (
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                Test Details
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Enter the basic information about your test</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm">Test Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Chapter 1-3 Quiz"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Subject *</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(subject => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Test Type *</Label>
                  <Select value={testType} onValueChange={(v) => setTestType(v as 'weekly' | 'monthly')}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly Test</SelectItem>
                      <SelectItem value="monthly">Monthly Test</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedSubjectData && (
                <div className="space-y-2">
                  <Label className="text-sm">Chapters {hasChapters ? '*' : '(Optional)'}</Label>
                  {hasChapters ? (
                    <div className="border rounded-lg p-3 sm:p-4 space-y-2 max-h-40 sm:max-h-48 overflow-y-auto">
                      {subjectChapters.map(chapter => (
                        <div key={chapter.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={chapter.id}
                            checked={selectedChapters.includes(chapter.id)}
                            onCheckedChange={() => handleChapterToggle(chapter.id)}
                          />
                          <Label htmlFor={chapter.id} className="cursor-pointer text-sm">
                            {chapter.title}
                          </Label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border rounded-lg p-3 sm:p-4 text-muted-foreground text-xs sm:text-sm">
                      No chapters available for this subject. You can create the test without chapters.
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-sm">Duration (min) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={5}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marks" className="text-sm">Total Marks *</Label>
                  <Input
                    id="marks"
                    type="number"
                    min={1}
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(Number(e.target.value))}
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Difficulty</Label>
                  <Select value={difficulty} onValueChange={(v) => setDifficulty(v as 'easy' | 'medium' | 'hard')}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Special Instructions (optional)</Label>
                  <Textarea
                    rows={3}
                    placeholder="Any extra instructions for AI or students (e.g., focus on application-level questions, avoid heavy calculations, etc.)"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Add Questions */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {/* AI Question Generator */}
            <Card>
              <CardHeader className="space-y-3">
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Questions
                </CardTitle>
                <CardDescription>
                  Add questions manually or use AI to generate them from chapter content
                </CardDescription>
                <AIQuestionGenerator
                  selectedChapters={selectedChapters}
                  chapters={subjectChapters}
                  totalMarks={totalMarks}
                  currentQuestionMarks={totalQuestionMarks}
                  subjectName={selectedSubjectData?.name || 'Unknown Subject'}
                  onQuestionsGenerated={addGeneratedQuestions}
                />
              </CardHeader>
            </Card>

            {/* Add New Question Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Question Manually
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Question Type</Label>
                  <Select 
                    value={newQuestion.type} 
                    onValueChange={(v) => setNewQuestion({
                      ...newQuestion, 
                      type: v as 'mcq' | 'blank' | 'short' | 'long',
                      options: v === 'mcq' ? ['', '', '', ''] : undefined,
                      correctAnswer: ''
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mcq">Multiple Choice (MCQ)</SelectItem>
                      <SelectItem value="blank">Fill in the Blank</SelectItem>
                      <SelectItem value="short">Short Answer</SelectItem>
                      <SelectItem value="long">Long Answer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Question Text *</Label>
                  <Textarea
                    placeholder={
                      newQuestion.type === 'blank' 
                        ? "Enter question with _____ for blank (e.g., The capital of France is _____)"
                        : "Enter your question here..."
                    }
                    value={newQuestion.text}
                    onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                  />
                </div>

                {newQuestion.type === 'mcq' && (
                  <div className="space-y-4">
                    <Label>Options *</Label>
                    <RadioGroup
                      value={newQuestion.correctAnswer}
                      onValueChange={(v) => setNewQuestion({ ...newQuestion, correctAnswer: v })}
                    >
                      {newQuestion.options?.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <RadioGroupItem value={`option${index}`} id={`option${index}`} />
                          <Input
                            placeholder={`Option ${index + 1}`}
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(newQuestion.options || [])];
                              newOptions[index] = e.target.value;
                              setNewQuestion({ ...newQuestion, options: newOptions });
                            }}
                            className="flex-1"
                          />
                          {newQuestion.correctAnswer === `option${index}` && (
                            <Check className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      ))}
                    </RadioGroup>
                    <p className="text-sm text-muted-foreground">
                      Select the radio button next to the correct answer
                    </p>
                  </div>
                )}

                {newQuestion.type === 'blank' && (
                  <div className="space-y-2">
                    <Label>Correct Answer *</Label>
                    <Input
                      placeholder="Enter the correct answer"
                      value={newQuestion.correctAnswer}
                      onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
                    />
                  </div>
                )}

                {newQuestion.type === 'short' && (
                  <Alert>
                    <HelpCircle className="h-4 w-4" />
                    <AlertDescription>
                      Short answer questions will be saved for teacher review. No auto-grading.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label>Marks *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newQuestion.marks}
                    onChange={(e) => setNewQuestion({ ...newQuestion, marks: Number(e.target.value) })}
                    className="w-24"
                  />
                </div>

                <Button onClick={addQuestion} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Question
                </Button>
              </CardContent>
            </Card>

            {/* Questions List */}
            {questions.length > 0 && (
              <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <CardTitle>Questions ({questions.length})</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearAllQuestions}
                  >
                    <Trash2 className="mr-2 h-3 w-3" />
                    Delete All
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {questions.map((question, index) => (
                    <Collapsible key={question.id} open={expandedQuestions.includes(question.id)}>
                      <div className="border rounded-lg p-3">
                        <CollapsibleTrigger 
                          className="flex items-center justify-between w-full"
                          onClick={() => toggleExpanded(question.id)}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab flex-shrink-0" />
                            <span className="font-medium flex-shrink-0">Q{index + 1}.</span>
                            <span className="text-sm text-muted-foreground capitalize flex-shrink-0">
                              ({question.type === 'mcq' ? 'Mcq' : question.type === 'blank' ? 'Blank' : question.type === 'short' ? 'Short' : 'Long'})
                            </span>
                            <span className="text-sm truncate min-w-0">
                              <span className="sm:hidden">
                                {question.text.split(' ').slice(0, 3).join(' ')}...
                              </span>
                              <span className="hidden sm:inline">
                                {question.text.substring(0, 50)}...
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{question.marks} marks</span>
                            {expandedQuestions.includes(question.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-4">
                          <div className="space-y-2 pl-6">
                            <p className="font-medium">{question.text}</p>
                            {question.type === 'mcq' && question.options && (
                              <div className="space-y-1">
                                {question.options.map((opt, i) => (
                                  <div 
                                    key={i} 
                                    className={`text-sm p-2 rounded ${
                                      question.correctAnswer === `option${i}` 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-muted'
                                    }`}
                                  >
                                    {String.fromCharCode(65 + i)}. {opt}
                                    {question.correctAnswer === `option${i}` && (
                                      <Check className="inline ml-2 h-3 w-3" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            {question.type === 'blank' && (
                              <p className="text-sm">
                                <span className="font-medium">Answer:</span> {question.correctAnswer}
                              </p>
                            )}
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => removeQuestion(question.id)}
                            >
                              <Trash2 className="mr-2 h-3 w-3" />
                              Remove
                            </Button>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 3: Review & Publish */}
        {currentStep === 3 && (
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Eye className="h-5 w-5" />
                Review & Publish
              </CardTitle>
              <CardDescription>Review your test before publishing</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">Test Title</p>
                  <p className="font-medium text-sm sm:text-base">{testTitle}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">Subject</p>
                  <p className="font-medium text-sm sm:text-base">{selectedSubjectData?.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">Test Type</p>
                  <p className="font-medium capitalize text-sm sm:text-base">{testType}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium text-sm sm:text-base">{duration} minutes</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Questions</p>
                  <p className="font-medium text-sm sm:text-base">{questions.length}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Marks</p>
                  <p className="font-medium text-sm sm:text-base">{totalQuestionMarks}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">Difficulty</p>
                  <p className="font-medium capitalize text-sm sm:text-base">{difficulty}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-medium text-sm sm:text-base">Questions Preview</p>
                <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                  {questions.map((q, i) => (
                    <div key={q.id} className="p-2 sm:p-3">
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <span className="font-medium text-sm break-words">Q{i + 1}. {q.text}</span>
                        <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0">{q.marks} marks</span>
                      </div>
                      <span className="text-xs text-muted-foreground capitalize">({q.type})</span>
                    </div>
                  ))}
                </div>
              </div>

              <Alert className="relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 animate-pulse" aria-hidden="true" />
                <div className="relative flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  <AlertDescription>
                    Once published, this test will be visible to all students.
                  </AlertDescription>
                </div>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-4 sm:mt-6 gap-2">
          <Button 
            variant="outline" 
            onClick={handleBack}
            disabled={currentStep === 1}
            size="sm"
            className="text-xs sm:text-sm"
          >
            <ArrowLeft className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Back</span>
          </Button>

          {currentStep < 3 ? (
            <Button onClick={handleNext} size="sm" className="text-xs sm:text-sm">
              Next
              <ArrowRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          ) : (
            <Button onClick={handlePublish} disabled={loading} size="sm" className="text-xs sm:text-sm">
              {loading ? (
                <>
                  <Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Check className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  Publish
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestCreationWizard;
