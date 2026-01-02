// Firebase Configuration for Nexus Learn
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { getDatabase, ref, set, get, push, remove, update, onValue } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDuYyUDMAaWAEhIfl56zbOltkd9QE9TExA",
  authDomain: "nexuslearn-66afd.firebaseapp.com",
  databaseURL: "https://nexuslearn-66afd-default-rtdb.firebaseio.com",
  projectId: "nexuslearn-66afd",
  storageBucket: "nexuslearn-66afd.firebasestorage.app",
  messagingSenderId: "814853787242",
  appId: "1:814853787242:web:741a9358080809100a0413"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);

// Auth functions
export const registerUser = async (email: string, password: string, displayName: string, phone: string, role: 'teacher' | 'student') => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(userCredential.user, { displayName });
  await set(ref(database, `users/${userCredential.user.uid}`), { email, displayName, phone, role, createdAt: Date.now() });
  return userCredential.user;
};

export const loginUser = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const logoutUser = async () => { await signOut(auth); };

export const resetPassword = async (email: string) => { await sendPasswordResetEmail(auth, email); };

export const getUserRole = async (uid: string): Promise<'teacher' | 'student' | null> => {
  const snapshot = await get(ref(database, `users/${uid}/role`));
  return snapshot.val();
};

// Standalone database functions for new components
export const getSubjects = async () => {
  const snapshot = await get(ref(database, 'subjects'));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  // Support both shapes:
  // 1) subjects/{id} = { id, name, ... }
  // 2) subjects/{id} = { name, ... } (id stored as key)
  return Object.entries(data).map(([key, value]: any) => ({
    id: value?.id ?? key,
    ...value
  }));
};

export const saveSubject = async (subjectData: { name: string; chapters: any[] }) => {
  const newRef = push(ref(database, 'subjects'));
  await set(newRef, { ...subjectData, id: newRef.key });
  return newRef.key;
};

export const updateSubject = async (subjectId: string, subjectData: any) => {
  await update(ref(database, `subjects/${subjectId}`), subjectData);
};

export const deleteSubject = async (subjectId: string) => {
  await remove(ref(database, `subjects/${subjectId}`));
};

export const saveTest = async (testData: any) => {
  const newRef = push(ref(database, 'tests'));
  await set(newRef, { ...testData, id: newRef.key, createdAt: Date.now(), published: true });
  return newRef.key;
};

export const getTests = async () => {
  const snapshot = await get(ref(database, 'tests'));
  return snapshot.exists() ? Object.values(snapshot.val()) : [];
};

export const getTestById = async (testId: string) => {
  const snapshot = await get(ref(database, `tests/${testId}`));
  return snapshot.val();
};

export const saveSubmission = async (submissionData: any) => {
  const newRef = push(ref(database, 'submissions'));
  await set(newRef, { ...submissionData, id: newRef.key, submittedAt: Date.now() });
  return newRef.key;
};

export const getSubmissions = async () => {
  const snapshot = await get(ref(database, 'submissions'));
  return snapshot.exists() ? Object.values(snapshot.val()) : [];
};

export const updateSubmission = async (submissionId: string, data: any) => {
  await update(ref(database, `submissions/${submissionId}`), data);
};

export { onAuthStateChanged };
export type { User };

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
  subjectName?: string;
  chapterIds: string[];
  duration: number;
  totalMarks?: number;
  type: 'weekly' | 'monthly' | 'quiz' | 'final' | 'Quiz' | 'Mid-Term' | 'Final' | 'Practice';
  status?: 'upcoming' | 'completed' | 'in-progress' | 'pending-review' | 'published' | 'draft';
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
    return Object.entries(data).map(([key, value]: any) => ({
      id: value?.id ?? key,
      ...value
    })) as Subject[];
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
    // Handle both flat collection (q.testId) and nested structure (questions/{testId}/...)
    const allQuestions = Object.entries(data).flatMap(([key, value]: [string, any]) => {
      // If this is a nested structure where key is testId
      if (key === testId && typeof value === 'object' && !value.testId) {
        // It's nested under questions/{testId}
        return Object.values(value).map((q: any, idx: number) => ({
          ...q,
          id: q.id || `${testId}-${idx}`,
          testId: testId
        }));
      }
      // If it's a flat structure with testId property
      if (value?.testId === testId) {
        return [value];
      }
      return [];
    });
    return allQuestions as Question[];
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
