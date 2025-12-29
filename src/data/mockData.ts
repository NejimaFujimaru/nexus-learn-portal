// Mock data for Nexus Learn Educational Portal

export interface Test {
  id: string;
  name: string;
  type: 'Quiz' | 'Mid-Term' | 'Final' | 'Practice';
  subject: string;
  chapters: string[];
  date: string;
  duration: number; // in minutes
  totalMarks: number;
  status: 'upcoming' | 'completed' | 'in-progress' | 'pending-review';
}

export interface TestResult {
  testId: string;
  score: number;
  totalMarks: number;
  percentage: number;
  sectionBreakdown: {
    section: string;
    obtained: number;
    total: number;
  }[];
  aiFeedback: string;
  teacherRemarks: string;
  submittedAt: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  grade: string;
}

export interface Submission {
  id: string;
  studentId: string;
  studentName: string;
  testId: string;
  testName: string;
  submittedAt: string;
  status: 'pending' | 'reviewed' | 'approved';
  aiScore?: number;
  aiConfidence?: number;
}

export const mockTests: Test[] = [];

export const mockTestResults: TestResult[] = [];

export const mockQuestions = {
  mcq: [
    {
      id: 'q1',
      question: 'What is the derivative of x²?',
      options: ['x', '2x', '2x²', 'x²'],
      correctAnswer: 1,
    },
    {
      id: 'q2',
      question: 'Which of the following is a linear equation?',
      options: ['y = x²', 'y = 2x + 3', 'y = x³ + 1', 'y = √x'],
      correctAnswer: 1,
    },
    {
      id: 'q3',
      question: 'Solve: 2x + 5 = 15',
      options: ['x = 5', 'x = 10', 'x = 7.5', 'x = 4'],
      correctAnswer: 0,
    },
  ],
  fillBlanks: [
    {
      id: 'f1',
      question: 'The slope of a horizontal line is _____.',
      answer: '0',
    },
    {
      id: 'f2',
      question: 'The quadratic formula is x = (-b ± √(b² - 4ac)) / _____.',
      answer: '2a',
    },
  ],
  shortAnswer: [
    {
      id: 's1',
      question: 'Explain the difference between a function and a relation.',
    },
    {
      id: 's2',
      question: 'Describe the process of solving a system of linear equations using substitution.',
    },
  ],
};

export const mockSubmissions: Submission[] = [];

export const mockStudentAnswers = {
  mcq: [
    { questionId: 'q1', selectedOption: 1 },
    { questionId: 'q2', selectedOption: 1 },
    { questionId: 'q3', selectedOption: 2 },
  ],
  fillBlanks: [
    { questionId: 'f1', answer: 'zero' },
    { questionId: 'f2', answer: '2a' },
  ],
  shortAnswer: [
    { questionId: 's1', answer: 'A relation is any set of ordered pairs, while a function is a special type of relation where each input has exactly one output. In other words, in a function, no two ordered pairs have the same first element with different second elements.' },
    { questionId: 's2', answer: 'To solve using substitution: 1) Solve one equation for one variable. 2) Substitute this expression into the other equation. 3) Solve for the remaining variable. 4) Substitute back to find the other variable.' },
  ],
};

export const teacherStats = {
  totalStudents: 0,
  totalTests: 0,
  pendingSubmissions: 0,
  averageScore: 0,
};
