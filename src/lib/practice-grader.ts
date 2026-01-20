import { callOpenRouterWithFallback } from './openrouter-helper';

export interface PracticeQuestion {
  id: string;
  type: 'mcq' | 'fillBlank' | 'shortAnswer' | 'longAnswer';
  text: string;
  options?: string[];
  correctAnswer?: string | number;
  marks: number;
}

export interface PracticeAnswer {
  questionId: string;
  answer: string | number;
}

export interface GradingResult {
  questionId: string;
  marksObtained: number;
  maxMarks: number;
  feedback: string;
  isCorrect: boolean;
}

export interface PracticeGradingResponse {
  totalScore: number;
  maxScore: number;
  percentage: number;
  results: GradingResult[];
  overallFeedback: string;
  gradedAt: string;
}

// Calculate similarity for fill-in-the-blank and short answers
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1;
  
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  
  return (longer.length - costs[s2.length]) / longer.length;
}

// Grade MCQ questions locally (no AI needed)
function gradeMCQ(question: PracticeQuestion, answer: string | number): GradingResult {
  const correctIndex = typeof question.correctAnswer === 'number' 
    ? question.correctAnswer 
    : parseInt(String(question.correctAnswer), 10);
  
  const studentIndex = typeof answer === 'number' ? answer : parseInt(String(answer), 10);
  const isCorrect = correctIndex === studentIndex;
  
  return {
    questionId: question.id,
    marksObtained: isCorrect ? question.marks : 0,
    maxMarks: question.marks,
    feedback: isCorrect ? 'Correct!' : `Incorrect. The correct answer was option ${correctIndex + 1}.`,
    isCorrect
  };
}

// Grade fill-in-the-blank questions locally
function gradeFillBlank(question: PracticeQuestion, answer: string): GradingResult {
  const correctAnswer = String(question.correctAnswer || '').toLowerCase().trim();
  const studentAnswer = String(answer).toLowerCase().trim();
  
  const similarity = calculateSimilarity(studentAnswer, correctAnswer);
  const isCorrect = similarity >= 0.85; // 85% similarity threshold
  
  return {
    questionId: question.id,
    marksObtained: isCorrect ? question.marks : (similarity >= 0.6 ? Math.floor(question.marks * 0.5) : 0),
    maxMarks: question.marks,
    feedback: isCorrect 
      ? 'Correct!' 
      : similarity >= 0.6 
        ? `Partially correct. Expected: "${question.correctAnswer}"`
        : `Incorrect. The correct answer was: "${question.correctAnswer}"`,
    isCorrect
  };
}

// Grade short/long answers using AI
async function gradeWithAI(
  questions: PracticeQuestion[],
  answers: PracticeAnswer[]
): Promise<GradingResult[]> {
  const questionsToGrade = questions.filter(q => 
    q.type === 'shortAnswer' || q.type === 'longAnswer'
  );
  
  if (questionsToGrade.length === 0) return [];
  
  const prompt = `You are an educational grading assistant. Grade the following student answers.

For each question, provide:
1. A score from 0 to the maximum marks
2. Brief feedback (1-2 sentences)

Questions and Answers:
${questionsToGrade.map(q => {
  const answer = answers.find(a => a.questionId === q.id);
  return `
Question (${q.type}, ${q.marks} marks): ${q.text}
${q.correctAnswer ? `Model Answer: ${q.correctAnswer}` : ''}
Student Answer: ${answer?.answer || 'No answer provided'}
`;
}).join('\n---\n')}

Respond in JSON format:
{
  "grades": [
    {
      "questionId": "id",
      "marksObtained": number,
      "feedback": "string",
      "isCorrect": boolean
    }
  ]
}`;

  try {
    const response = await callOpenRouterWithFallback({
      systemMessage: 'You are a fair and constructive educational grader. Always respond with valid JSON only.',
      userMessage: prompt,
      temperature: 0.3,
      maxTokens: 1500
    });
    
    // Parse AI response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid AI response format');
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return questionsToGrade.map(q => {
      const grade = parsed.grades?.find((g: any) => g.questionId === q.id) || {
        marksObtained: 0,
        feedback: 'Could not grade this answer.',
        isCorrect: false
      };
      
      return {
        questionId: q.id,
        marksObtained: Math.min(grade.marksObtained, q.marks),
        maxMarks: q.marks,
        feedback: grade.feedback,
        isCorrect: grade.isCorrect
      };
    });
  } catch (error) {
    console.error('AI grading error:', error);
    // Fallback: give partial credit based on answer length
    return questionsToGrade.map(q => {
      const answer = answers.find(a => a.questionId === q.id);
      const answerText = String(answer?.answer || '');
      const hasSubstantiveAnswer = answerText.length > 20;
      
      return {
        questionId: q.id,
        marksObtained: hasSubstantiveAnswer ? Math.floor(q.marks * 0.5) : 0,
        maxMarks: q.marks,
        feedback: 'Auto-graded based on response completeness.',
        isCorrect: false
      };
    });
  }
}

// Generate overall AI feedback
async function generateOverallFeedback(
  totalScore: number,
  maxScore: number,
  results: GradingResult[]
): Promise<string> {
  const percentage = Math.round((totalScore / maxScore) * 100);
  const correctCount = results.filter(r => r.isCorrect).length;
  const totalQuestions = results.length;
  
  try {
    const response = await callOpenRouterWithFallback({
      systemMessage: 'You are an encouraging educational coach. Provide brief, constructive feedback.',
      userMessage: `A student completed a practice test with the following results:
- Score: ${totalScore}/${maxScore} (${percentage}%)
- Correct answers: ${correctCount}/${totalQuestions}

Provide 2-3 sentences of encouraging feedback and one specific suggestion for improvement.`,
      temperature: 0.7,
      maxTokens: 200
    });
    
    return response;
  } catch (error) {
    console.error('Feedback generation error:', error);
    if (percentage >= 80) {
      return `Excellent work! You scored ${percentage}% on this practice test. Keep up the great effort!`;
    } else if (percentage >= 60) {
      return `Good effort! You scored ${percentage}%. Review the questions you missed and try again to improve.`;
    } else {
      return `You scored ${percentage}% on this practice. Review the material and practice more to improve your understanding.`;
    }
  }
}

export async function gradePracticeTest(
  questions: PracticeQuestion[],
  answers: PracticeAnswer[],
  onProgress?: (stage: string) => void
): Promise<PracticeGradingResponse> {
  const results: GradingResult[] = [];
  
  onProgress?.('Analyzing your answers...');
  
  // Grade MCQ and fill-in-blank locally
  for (const question of questions) {
    const answer = answers.find(a => a.questionId === question.id);
    
    if (question.type === 'mcq') {
      results.push(gradeMCQ(question, answer?.answer ?? -1));
    } else if (question.type === 'fillBlank') {
      results.push(gradeFillBlank(question, String(answer?.answer ?? '')));
    }
  }
  
  onProgress?.('Grading written responses...');
  
  // Grade short/long answers with AI
  const aiResults = await gradeWithAI(questions, answers);
  results.push(...aiResults);
  
  // Calculate totals
  const totalScore = results.reduce((sum, r) => sum + r.marksObtained, 0);
  const maxScore = results.reduce((sum, r) => sum + r.maxMarks, 0);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  
  onProgress?.('Generating feedback...');
  
  // Generate overall feedback
  const overallFeedback = await generateOverallFeedback(totalScore, maxScore, results);
  
  return {
    totalScore,
    maxScore,
    percentage,
    results,
    overallFeedback,
    gradedAt: new Date().toISOString()
  };
}
