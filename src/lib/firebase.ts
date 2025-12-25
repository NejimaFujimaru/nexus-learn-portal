// Firebase Configuration for Nexus Learn
// Replace these values with your Firebase project credentials

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, push, remove, update, onValue } from 'firebase/database';

// TODO: Replace with your Firebase config from console.firebase.google.com
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);

// Database Types
export interface Subject {
  id: string;
  name: string;
  createdAt: string;
}

export interface Chapter {
  id: string;
  subjectId: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface Question {
  id: string;
  testId: string;
  type: 'mcq' | 'fillBlank' | 'shortAnswer';
  text: string;
  options?: string[];
  correctAnswer?: string | number;
  marks: number;
}

export interface Test {
  id: string;
  title: string;
  subjectId: string;
  chapterIds: string[];
  duration: number;
  type: 'weekly' | 'monthly' | 'quiz' | 'final';
  createdAt: string;
  published: boolean;
}

export interface Submission {
  id: string;
  testId: string;
  studentId: string;
  studentName: string;
  answers: {
    questionId: string;
    answer: string | number;
  }[];
  mcqScore: number;
  fillBlankScore: number;
  totalAutoScore: number;
  shortAnswerMarks?: number;
  status: 'pending' | 'graded';
  submittedAt: string;
  teacherRemarks?: string;
}

// Database Operations
export const dbOperations = {
  // Subjects
  async addSubject(name: string): Promise<string> {
    const subjectsRef = ref(database, 'subjects');
    const newRef = push(subjectsRef);
    const subject: Subject = {
      id: newRef.key!,
      name,
      createdAt: new Date().toISOString()
    };
    await set(newRef, subject);
    return newRef.key!;
  },

  async getSubjects(): Promise<Subject[]> {
    const snapshot = await get(ref(database, 'subjects'));
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return Object.values(data);
  },

  async updateSubject(id: string, name: string): Promise<void> {
    await update(ref(database, `subjects/${id}`), { name });
  },

  async deleteSubject(id: string): Promise<void> {
    await remove(ref(database, `subjects/${id}`));
  },

  // Chapters
  async addChapter(subjectId: string, title: string, content: string): Promise<string> {
    const chaptersRef = ref(database, 'chapters');
    const newRef = push(chaptersRef);
    const chapter: Chapter = {
      id: newRef.key!,
      subjectId,
      title,
      content,
      createdAt: new Date().toISOString()
    };
    await set(newRef, chapter);
    return newRef.key!;
  },

  async getChaptersBySubject(subjectId: string): Promise<Chapter[]> {
    const snapshot = await get(ref(database, 'chapters'));
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return Object.values(data).filter((c: any) => c.subjectId === subjectId) as Chapter[];
  },

  async updateChapter(id: string, title: string, content: string): Promise<void> {
    await update(ref(database, `chapters/${id}`), { title, content });
  },

  async deleteChapter(id: string): Promise<void> {
    await remove(ref(database, `chapters/${id}`));
  },

  // Tests
  async addTest(test: Omit<Test, 'id' | 'createdAt'>): Promise<string> {
    const testsRef = ref(database, 'tests');
    const newRef = push(testsRef);
    const newTest: Test = {
      ...test,
      id: newRef.key!,
      createdAt: new Date().toISOString()
    };
    await set(newRef, newTest);
    return newRef.key!;
  },

  async getTests(): Promise<Test[]> {
    const snapshot = await get(ref(database, 'tests'));
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return Object.values(data);
  },

  async getPublishedTests(): Promise<Test[]> {
    const tests = await this.getTests();
    return tests.filter(t => t.published);
  },

  async updateTest(id: string, updates: Partial<Test>): Promise<void> {
    await update(ref(database, `tests/${id}`), updates);
  },

  // Questions
  async addQuestion(question: Omit<Question, 'id'>): Promise<string> {
    const questionsRef = ref(database, 'questions');
    const newRef = push(questionsRef);
    const newQuestion: Question = {
      ...question,
      id: newRef.key!
    };
    await set(newRef, newQuestion);
    return newRef.key!;
  },

  async getQuestionsByTest(testId: string): Promise<Question[]> {
    const snapshot = await get(ref(database, 'questions'));
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return Object.values(data).filter((q: any) => q.testId === testId) as Question[];
  },

  async updateQuestion(id: string, updates: Partial<Question>): Promise<void> {
    await update(ref(database, `questions/${id}`), updates);
  },

  async deleteQuestion(id: string): Promise<void> {
    await remove(ref(database, `questions/${id}`));
  },

  // Submissions
  async addSubmission(submission: Omit<Submission, 'id' | 'submittedAt'>): Promise<string> {
    const submissionsRef = ref(database, 'submissions');
    const newRef = push(submissionsRef);
    const newSubmission: Submission = {
      ...submission,
      id: newRef.key!,
      submittedAt: new Date().toISOString()
    };
    await set(newRef, newSubmission);
    return newRef.key!;
  },

  async getSubmissions(): Promise<Submission[]> {
    const snapshot = await get(ref(database, 'submissions'));
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return Object.values(data);
  },

  async getSubmissionsByTest(testId: string): Promise<Submission[]> {
    const submissions = await this.getSubmissions();
    return submissions.filter(s => s.testId === testId);
  },

  async getSubmissionsByStudent(studentId: string): Promise<Submission[]> {
    const submissions = await this.getSubmissions();
    return submissions.filter(s => s.studentId === studentId);
  },

  async updateSubmission(id: string, updates: Partial<Submission>): Promise<void> {
    await update(ref(database, `submissions/${id}`), updates);
  },

  // Real-time listeners
  subscribeToSubjects(callback: (subjects: Subject[]) => void): () => void {
    const subjectsRef = ref(database, 'subjects');
    const unsubscribe = onValue(subjectsRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }
      callback(Object.values(snapshot.val()));
    });
    return unsubscribe;
  },

  subscribeToTests(callback: (tests: Test[]) => void): () => void {
    const testsRef = ref(database, 'tests');
    const unsubscribe = onValue(testsRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }
      callback(Object.values(snapshot.val()));
    });
    return unsubscribe;
  },

  subscribeToSubmissions(callback: (submissions: Submission[]) => void): () => void {
    const submissionsRef = ref(database, 'submissions');
    const unsubscribe = onValue(submissionsRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }
      callback(Object.values(snapshot.val()));
    });
    return unsubscribe;
  }
};
