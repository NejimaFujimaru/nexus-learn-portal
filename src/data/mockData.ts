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

export const mockTests: Test[] = [
  {
    id: '1',
    name: 'Mathematics Unit Test 1',
    type: 'Quiz',
    subject: 'Mathematics',
    chapters: ['Algebra', 'Linear Equations'],
    date: '2025-01-10',
    duration: 45,
    totalMarks: 50,
    status: 'upcoming',
  },
  {
    id: '2',
    name: 'Physics Mid-Term Exam',
    type: 'Mid-Term',
    subject: 'Physics',
    chapters: ['Mechanics', 'Thermodynamics', 'Waves'],
    date: '2025-01-15',
    duration: 120,
    totalMarks: 100,
    status: 'upcoming',
  },
  {
    id: '3',
    name: 'Chemistry Practice Test',
    type: 'Practice',
    subject: 'Chemistry',
    chapters: ['Organic Chemistry'],
    date: '2025-01-05',
    duration: 30,
    totalMarks: 30,
    status: 'completed',
  },
  {
    id: '4',
    name: 'Biology Final Exam',
    type: 'Final',
    subject: 'Biology',
    chapters: ['Cell Biology', 'Genetics', 'Ecology', 'Human Anatomy'],
    date: '2024-12-20',
    duration: 180,
    totalMarks: 150,
    status: 'completed',
  },
];

export const mockTestResults: TestResult[] = [
  {
    testId: '3',
    score: 24,
    totalMarks: 30,
    percentage: 80,
    sectionBreakdown: [
      { section: 'MCQ', obtained: 12, total: 15 },
      { section: 'Fill in the Blanks', obtained: 6, total: 7 },
      { section: 'Short Answer', obtained: 6, total: 8 },
    ],
    aiFeedback: 'Excellent understanding of organic chemistry concepts. Consider reviewing reaction mechanisms for better performance.',
    teacherRemarks: 'Great work! Keep practicing organic reactions.',
    submittedAt: '2025-01-05T10:30:00Z',
  },
  {
    testId: '4',
    score: 128,
    totalMarks: 150,
    percentage: 85,
    sectionBreakdown: [
      { section: 'MCQ', obtained: 45, total: 50 },
      { section: 'Fill in the Blanks', obtained: 28, total: 30 },
      { section: 'Short Answer', obtained: 55, total: 70 },
    ],
    aiFeedback: 'Strong grasp of biological concepts. The short answer section shows good analytical skills. Minor improvements needed in genetics terminology.',
    teacherRemarks: 'Outstanding performance! Your dedication shows.',
    submittedAt: '2024-12-20T14:45:00Z',
  },
];

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

export const mockSubmissions: Submission[] = [
  {
    id: 'sub1',
    studentId: 'std1',
    studentName: 'Alice Johnson',
    testId: '1',
    testName: 'Mathematics Unit Test 1',
    submittedAt: '2025-01-10T10:45:00Z',
    status: 'pending',
    aiScore: 42,
    aiConfidence: 87,
  },
  {
    id: 'sub2',
    studentId: 'std2',
    studentName: 'Bob Smith',
    testId: '1',
    testName: 'Mathematics Unit Test 1',
    submittedAt: '2025-01-10T10:50:00Z',
    status: 'pending',
    aiScore: 38,
    aiConfidence: 92,
  },
  {
    id: 'sub3',
    studentId: 'std3',
    studentName: 'Carol Davis',
    testId: '2',
    testName: 'Physics Mid-Term Exam',
    submittedAt: '2025-01-15T14:20:00Z',
    status: 'reviewed',
    aiScore: 85,
    aiConfidence: 78,
  },
  {
    id: 'sub4',
    studentId: 'std4',
    studentName: 'David Wilson',
    testId: '3',
    testName: 'Chemistry Practice Test',
    submittedAt: '2025-01-05T09:30:00Z',
    status: 'approved',
    aiScore: 27,
    aiConfidence: 95,
  },
];

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
  totalStudents: 127,
  totalTests: 24,
  pendingSubmissions: 15,
  averageScore: 78.5,
};
