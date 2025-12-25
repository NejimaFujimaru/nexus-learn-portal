import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { ArrowLeft, Plus, Trash2, Save, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface MCQQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

interface FillBlankQuestion {
  id: string;
  question: string;
  answer: string;
}

interface ShortAnswerQuestion {
  id: string;
  question: string;
}

const QuestionBuilder = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('mcq');
  
  const [mcqQuestions, setMcqQuestions] = useState<MCQQuestion[]>([
    { id: '1', question: '', options: ['', '', '', ''], correctAnswer: 0 }
  ]);
  
  const [fillBlankQuestions, setFillBlankQuestions] = useState<FillBlankQuestion[]>([
    { id: '1', question: '', answer: '' }
  ]);
  
  const [shortAnswerQuestions, setShortAnswerQuestions] = useState<ShortAnswerQuestion[]>([
    { id: '1', question: '' }
  ]);

  // MCQ functions
  const addMCQ = () => {
    setMcqQuestions([
      ...mcqQuestions,
      { id: Date.now().toString(), question: '', options: ['', '', '', ''], correctAnswer: 0 }
    ]);
  };

  const updateMCQ = (id: string, field: string, value: any) => {
    setMcqQuestions(mcqQuestions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const updateMCQOption = (id: string, optionIndex: number, value: string) => {
    setMcqQuestions(mcqQuestions.map(q => {
      if (q.id === id) {
        const newOptions = [...q.options];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const removeMCQ = (id: string) => {
    if (mcqQuestions.length > 1) {
      setMcqQuestions(mcqQuestions.filter(q => q.id !== id));
    }
  };

  // Fill Blank functions
  const addFillBlank = () => {
    setFillBlankQuestions([
      ...fillBlankQuestions,
      { id: Date.now().toString(), question: '', answer: '' }
    ]);
  };

  const updateFillBlank = (id: string, field: string, value: string) => {
    setFillBlankQuestions(fillBlankQuestions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const removeFillBlank = (id: string) => {
    if (fillBlankQuestions.length > 1) {
      setFillBlankQuestions(fillBlankQuestions.filter(q => q.id !== id));
    }
  };

  // Short Answer functions
  const addShortAnswer = () => {
    setShortAnswerQuestions([
      ...shortAnswerQuestions,
      { id: Date.now().toString(), question: '' }
    ]);
  };

  const updateShortAnswer = (id: string, value: string) => {
    setShortAnswerQuestions(shortAnswerQuestions.map(q => 
      q.id === id ? { ...q, question: value } : q
    ));
  };

  const removeShortAnswer = (id: string) => {
    if (shortAnswerQuestions.length > 1) {
      setShortAnswerQuestions(shortAnswerQuestions.filter(q => q.id !== id));
    }
  };

  const handleSave = () => {
    toast({
      title: "Questions Saved (Demo)",
      description: `Saved ${mcqQuestions.length} MCQs, ${fillBlankQuestions.length} Fill-in-the-blanks, and ${shortAnswerQuestions.length} Short Answer questions.`,
    });
    navigate('/teacher/dashboard');
  };

  const totalQuestions = mcqQuestions.length + fillBlankQuestions.length + shortAnswerQuestions.length;

  return (
    <div className="min-h-screen bg-background">
      <Header userType="teacher" userName="Dr. Sarah Mitchell" />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link 
          to="/teacher/create-test" 
          className="inline-flex items-center text-muted-foreground hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Test Setup
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Question Builder</h1>
            <p className="text-muted-foreground">Add questions to your test</p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {totalQuestions} Questions
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="mcq" className="data-[state=active]:bg-card">
              MCQ ({mcqQuestions.length})
            </TabsTrigger>
            <TabsTrigger value="fill" className="data-[state=active]:bg-card">
              Fill Blanks ({fillBlankQuestions.length})
            </TabsTrigger>
            <TabsTrigger value="short" className="data-[state=active]:bg-card">
              Short Answer ({shortAnswerQuestions.length})
            </TabsTrigger>
          </TabsList>

          {/* MCQ Tab */}
          <TabsContent value="mcq" className="space-y-4">
            {mcqQuestions.map((q, index) => (
              <Card key={q.id} className="bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      Question {index + 1}
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeMCQ(q.id)}
                      disabled={mcqQuestions.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Question</Label>
                    <Textarea
                      placeholder="Enter your question..."
                      value={q.question}
                      onChange={(e) => updateMCQ(q.id, 'question', e.target.value)}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>Options (select correct answer)</Label>
                    <RadioGroup 
                      value={q.correctAnswer.toString()}
                      onValueChange={(value) => updateMCQ(q.id, 'correctAnswer', parseInt(value))}
                    >
                      {q.options.map((option, optIndex) => (
                        <div key={optIndex} className="flex items-center gap-3">
                          <RadioGroupItem value={optIndex.toString()} id={`${q.id}-opt-${optIndex}`} />
                          <Input
                            placeholder={`Option ${optIndex + 1}`}
                            value={option}
                            onChange={(e) => updateMCQOption(q.id, optIndex, e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" className="w-full" onClick={addMCQ}>
              <Plus className="h-4 w-4 mr-2" />
              Add MCQ
            </Button>
          </TabsContent>

          {/* Fill Blanks Tab */}
          <TabsContent value="fill" className="space-y-4">
            {fillBlankQuestions.map((q, index) => (
              <Card key={q.id} className="bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      Question {index + 1}
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeFillBlank(q.id)}
                      disabled={fillBlankQuestions.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Question (use _____ for blank)</Label>
                    <Textarea
                      placeholder="e.g., The capital of France is _____."
                      value={q.question}
                      onChange={(e) => updateFillBlank(q.id, 'question', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Correct Answer</Label>
                    <Input
                      placeholder="Enter the correct answer..."
                      value={q.answer}
                      onChange={(e) => updateFillBlank(q.id, 'answer', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" className="w-full" onClick={addFillBlank}>
              <Plus className="h-4 w-4 mr-2" />
              Add Fill in the Blank
            </Button>
          </TabsContent>

          {/* Short Answer Tab */}
          <TabsContent value="short" className="space-y-4">
            {shortAnswerQuestions.map((q, index) => (
              <Card key={q.id} className="bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      Question {index + 1}
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeShortAnswer(q.id)}
                      disabled={shortAnswerQuestions.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>Question</Label>
                    <Textarea
                      placeholder="Enter your short answer question..."
                      value={q.question}
                      onChange={(e) => updateShortAnswer(q.id, e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    * Short answer questions will be evaluated by AI and reviewed by the teacher.
                  </p>
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" className="w-full" onClick={addShortAnswer}>
              <Plus className="h-4 w-4 mr-2" />
              Add Short Answer
            </Button>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <Button size="lg" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save All Questions
          </Button>
        </div>
      </main>
    </div>
  );
};

export default QuestionBuilder;
