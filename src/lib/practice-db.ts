import { ref, push, set, get, query, orderByChild, equalTo, onValue, off, update } from 'firebase/database';
import { database } from './firebase';
import { PracticeGradingResponse } from './practice-grader';

export interface PracticeSubmission {
  id?: string;
  studentId: string;
  studentName: string;
  testId: string;
  testTitle: string;
  subjectName: string;
  answers: Record<string, string | number>;
  grading: PracticeGradingResponse;
  practiceStreak: number;
  submittedAt: string;
}

export interface PracticeStats {
  totalPracticeTests: number;
  totalQuestionsAttempted: number;
  totalCorrectAnswers: number;
  averageAccuracy: number;
  currentStreak: number;
  lastPracticeDate: string | null;
}

// Add a new practice submission
export async function addPracticeSubmission(submission: Omit<PracticeSubmission, 'id'>): Promise<string> {
  const practiceRef = ref(database, 'practiceSubmissions');
  const newRef = push(practiceRef);
  
  await set(newRef, {
    ...submission,
    submittedAt: new Date().toISOString()
  });
  
  // Update practice stats
  await updatePracticeStats(submission.studentId, submission.grading);
  
  return newRef.key!;
}

// Get all practice submissions for a student
export async function getPracticeSubmissionsByStudent(studentId: string): Promise<PracticeSubmission[]> {
  const practiceRef = ref(database, 'practiceSubmissions');
  const snapshot = await get(practiceRef);
  
  if (!snapshot.exists()) return [];
  
  const submissions: PracticeSubmission[] = [];
  snapshot.forEach((child) => {
    const data = child.val();
    if (data.studentId === studentId) {
      submissions.push({
        id: child.key,
        ...data
      });
    }
  });
  
  // Sort by date descending
  return submissions.sort((a, b) => 
    new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
}

// Subscribe to practice submissions for real-time updates
export function subscribeToPracticeSubmissions(
  studentId: string,
  callback: (submissions: PracticeSubmission[]) => void
): () => void {
  const practiceRef = ref(database, 'practiceSubmissions');
  
  const handler = (snapshot: any) => {
    const submissions: PracticeSubmission[] = [];
    
    if (snapshot.exists()) {
      snapshot.forEach((child: any) => {
        const data = child.val();
        if (data.studentId === studentId) {
          submissions.push({
            id: child.key,
            ...data
          });
        }
      });
    }
    
    // Sort by date descending
    callback(submissions.sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    ));
  };
  
  onValue(practiceRef, handler);
  
  return () => off(practiceRef, 'value', handler);
}

// Get practice stats for a student
export async function getPracticeStats(studentId: string): Promise<PracticeStats> {
  const statsRef = ref(database, `practiceStats/${studentId}`);
  const snapshot = await get(statsRef);
  
  if (!snapshot.exists()) {
    return {
      totalPracticeTests: 0,
      totalQuestionsAttempted: 0,
      totalCorrectAnswers: 0,
      averageAccuracy: 0,
      currentStreak: 0,
      lastPracticeDate: null
    };
  }
  
  return snapshot.val();
}

// Subscribe to practice stats for real-time updates
export function subscribeToPracticeStats(
  studentId: string,
  callback: (stats: PracticeStats) => void
): () => void {
  const statsRef = ref(database, `practiceStats/${studentId}`);
  
  const handler = (snapshot: any) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback({
        totalPracticeTests: 0,
        totalQuestionsAttempted: 0,
        totalCorrectAnswers: 0,
        averageAccuracy: 0,
        currentStreak: 0,
        lastPracticeDate: null
      });
    }
  };
  
  onValue(statsRef, handler);
  
  return () => off(statsRef, 'value', handler);
}

// Update practice stats after completing a practice test
async function updatePracticeStats(studentId: string, grading: PracticeGradingResponse): Promise<void> {
  const statsRef = ref(database, `practiceStats/${studentId}`);
  const snapshot = await get(statsRef);
  
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  let stats: PracticeStats;
  
  if (snapshot.exists()) {
    stats = snapshot.val();
    
    // Check if streak should continue or reset
    if (stats.lastPracticeDate) {
      const lastDate = new Date(stats.lastPracticeDate);
      const hoursDiff = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        // Streak broken - reset to 1
        stats.currentStreak = 1;
      } else if (stats.lastPracticeDate.split('T')[0] !== today) {
        // New day, increment streak
        stats.currentStreak += 1;
      }
      // Same day - keep streak as is
    } else {
      stats.currentStreak = 1;
    }
  } else {
    stats = {
      totalPracticeTests: 0,
      totalQuestionsAttempted: 0,
      totalCorrectAnswers: 0,
      averageAccuracy: 0,
      currentStreak: 1,
      lastPracticeDate: null
    };
  }
  
  // Update stats
  const correctAnswers = grading.results.filter(r => r.isCorrect).length;
  stats.totalPracticeTests += 1;
  stats.totalQuestionsAttempted += grading.results.length;
  stats.totalCorrectAnswers += correctAnswers;
  stats.averageAccuracy = stats.totalQuestionsAttempted > 0
    ? Math.round((stats.totalCorrectAnswers / stats.totalQuestionsAttempted) * 100)
    : 0;
  stats.lastPracticeDate = now.toISOString();
  
  await set(statsRef, stats);
}

// Get a specific practice submission
export async function getPracticeSubmission(submissionId: string): Promise<PracticeSubmission | null> {
  const submissionRef = ref(database, `practiceSubmissions/${submissionId}`);
  const snapshot = await get(submissionRef);
  
  if (!snapshot.exists()) return null;
  
  return {
    id: submissionId,
    ...snapshot.val()
  };
}
