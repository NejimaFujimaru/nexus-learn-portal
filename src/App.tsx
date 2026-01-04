import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";

// Auth Pages
import StudentAuth from "./pages/auth/StudentAuth";
import TeacherAuth from "./pages/auth/TeacherAuth";

// Student Pages
import StudentDashboard from "./pages/student/StudentDashboard";
import TestDetails from "./pages/student/TestDetails";
import TestInstructions from "./pages/student/TestInstructions";
import TestInterface from "./pages/student/TestInterface";
import SubmissionConfirmation from "./pages/student/SubmissionConfirmation";
import TestResult from "./pages/student/TestResult";
import AcademicHistory from "./pages/student/AcademicHistory";

// Teacher Pages
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TestCreationWizard from "./pages/teacher/TestCreationWizard";
import QuestionBuilder from "./pages/teacher/QuestionBuilder";
import SubmissionsList from "./pages/teacher/SubmissionsList";
import SubmissionReview from "./pages/teacher/SubmissionReview";
import ManageSubjects from "./pages/teacher/ManageSubjects";
import ManageStudents from "./pages/teacher/ManageStudents";

// Shared Pages
import Settings from "./pages/Settings";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            
            {/* Auth Routes */}
            <Route path="/student/auth" element={<StudentAuth />} />
            <Route path="/teacher/auth" element={<TeacherAuth />} />
            
            {/* Student Routes */}
            <Route path="/student/dashboard" element={
              <ProtectedRoute allowedRole="student">
                <StudentDashboard />
              </ProtectedRoute>
            } />
            <Route path="/student/test/:testId/details" element={
              <ProtectedRoute allowedRole="student">
                <TestDetails />
              </ProtectedRoute>
            } />
            <Route path="/student/test/:testId/instructions" element={
              <ProtectedRoute allowedRole="student">
                <TestInstructions />
              </ProtectedRoute>
            } />
            <Route path="/student/test/:testId/take" element={
              <ProtectedRoute allowedRole="student">
                <TestInterface />
              </ProtectedRoute>
            } />
            <Route path="/student/test/:testId/submitted" element={
              <ProtectedRoute allowedRole="student">
                <SubmissionConfirmation />
              </ProtectedRoute>
            } />
            <Route path="/student/test/:testId/result" element={
              <ProtectedRoute allowedRole="student">
                <TestResult />
              </ProtectedRoute>
            } />
            <Route path="/student/history" element={
              <ProtectedRoute allowedRole="student">
                <AcademicHistory />
              </ProtectedRoute>
            } />
            
            {/* Settings Route - accessible by both roles */}
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            
            {/* Teacher Routes */}
            <Route path="/teacher/dashboard" element={
              <ProtectedRoute allowedRole="teacher">
                <TeacherDashboard />
              </ProtectedRoute>
            } />
            <Route path="/teacher/subjects" element={
              <ProtectedRoute allowedRole="teacher">
                <ManageSubjects />
              </ProtectedRoute>
            } />
            <Route path="/teacher/create-test" element={
              <ProtectedRoute allowedRole="teacher">
                <TestCreationWizard />
              </ProtectedRoute>
            } />
            <Route path="/teacher/question-builder" element={
              <ProtectedRoute allowedRole="teacher">
                <QuestionBuilder />
              </ProtectedRoute>
            } />
            <Route path="/teacher/submissions" element={
              <ProtectedRoute allowedRole="teacher">
                <SubmissionsList />
              </ProtectedRoute>
            } />
            <Route path="/teacher/submission/:submissionId" element={
              <ProtectedRoute allowedRole="teacher">
                <SubmissionReview />
              </ProtectedRoute>
            } />
            <Route path="/teacher/students" element={
              <ProtectedRoute allowedRole="teacher">
                <ManageStudents />
              </ProtectedRoute>
            } />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
