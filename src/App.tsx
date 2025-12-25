import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Student Pages
import StudentLogin from "./pages/student/StudentLogin";
import StudentDashboard from "./pages/student/StudentDashboard";
import TestDetails from "./pages/student/TestDetails";
import TestInstructions from "./pages/student/TestInstructions";
import TestInterface from "./pages/student/TestInterface";
import SubmissionConfirmation from "./pages/student/SubmissionConfirmation";
import TestResult from "./pages/student/TestResult";
import AcademicHistory from "./pages/student/AcademicHistory";

// Teacher Pages
import TeacherLogin from "./pages/teacher/TeacherLogin";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import CreateTest from "./pages/teacher/CreateTest";
import QuestionBuilder from "./pages/teacher/QuestionBuilder";
import SubmissionsList from "./pages/teacher/SubmissionsList";
import SubmissionReview from "./pages/teacher/SubmissionReview";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          
          {/* Student Routes */}
          <Route path="/student/login" element={<StudentLogin />} />
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/test/:testId/details" element={<TestDetails />} />
          <Route path="/student/test/:testId/instructions" element={<TestInstructions />} />
          <Route path="/student/test/:testId/take" element={<TestInterface />} />
          <Route path="/student/test/:testId/submitted" element={<SubmissionConfirmation />} />
          <Route path="/student/test/:testId/result" element={<TestResult />} />
          <Route path="/student/history" element={<AcademicHistory />} />
          
          {/* Teacher Routes */}
          <Route path="/teacher/login" element={<TeacherLogin />} />
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher/create-test" element={<CreateTest />} />
          <Route path="/teacher/question-builder" element={<QuestionBuilder />} />
          <Route path="/teacher/submissions" element={<SubmissionsList />} />
          <Route path="/teacher/submission/:submissionId" element={<SubmissionReview />} />
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
