# Nexus Learn - AI‑Powered Educational Portal

Nexus Learn is an AI‑assisted testing and learning portal for schools/teachers and students. It focuses on fast test creation, AI‑generated questions from chapter content, and a smooth test‑taking workflow.

This README explains:
- What the app does (features & flows)
- Tech stack and architecture
- How to run it locally
- How AI question generation works (OpenRouter)
- Firebase data model and config
- Current status (where the project is now)
- Project structure / file tree

---

## 1. High‑Level Features

### 1.1 Users & Roles

- **Teacher**
  - Register / login.
  - Create and manage subjects and chapters.
  - Build tests using a 3‑step Test Creation Wizard.
  - Auto‑generate questions from chapter content using AI.
  - Publish tests for students.
  - View submissions and review answers (including manual marking for short/long answers).

- **Student**
  - Register / login.
  - See assigned / available tests.
  - Read instructions and attempt tests.
  - Submit answers and see results / history.

Authentication and user roles are handled via **Firebase Authentication** + **Realtime Database**.

---

## 2. Core Flows

### 2.1 Teacher Authentication

- Screens: `src/pages/auth/TeacherAuth.tsx`
- Uses Firebase email/password auth.
- Upon successful login/registration, teacher metadata (name, phone, role) is stored in RTDB under `users/{uid}`.

### 2.2 Student Authentication

- Screens: `src/pages/auth/StudentAuth.tsx`
- Same Firebase auth flow, but role is `student` and they see student‑specific dashboard and test list.

### 2.3 Teacher Dashboard & Management

Key pages under `src/pages/teacher`:

- `TeacherDashboard.tsx`
  - High‑level overview: upcoming tests, quick actions, etc.

- `ManageSubjects.tsx`
  - CRUD for subjects (stored under `subjects` in RTDB).
  - Each subject can contain an embedded `chapters` list, or chapters can be stored globally.

- `ManageStudents.tsx`
  - Lists students, allows viewing / basic management.

- `ManageClasses.tsx`
  - Manage classes (which students belong to which class / section).

- `ManageTests.tsx`
  - Lists all tests created by the teacher.
  - Allows editing / viewing / navigating to submissions.

- `SubmissionsList.tsx` & `SubmissionReview.tsx`
  - View submissions for a test.
  - Review answers and update manual marks (for short / long answers).

### 2.4 Test Creation Wizard (Teacher)

Main page: `src/pages/teacher/TestCreationWizard.tsx`

The wizard has **3 steps**:

1. **Test Details**
   - Title, subject, test type (weekly/monthly), duration, total marks.
   - Select one or more chapters to pull content from.
   - Choose **difficulty**: `easy | medium | hard`.
   - Enter **special instructions**: free‑text notes for AI and/or students.

2. **Questions**
   - Shows a summary alert with how many questions currently exist and total marks.
   - **AI Question Generator** section (top) – opens the AI dialog.
   - Manual question builder:
     - Question type: MCQ, Fill in the Blank, Short Answer, Long Answer.
     - Question text (with `_____` for blanks).
     - For MCQ: 4 options + correct answer radio.
     - Marks per question.
   - Existing questions list:
     - Collapsible cards per question.
     - Shows type, text preview, options and correct answer (for MCQs), marks.
     - Supports expanding/collapsing and deleting.

3. **Review & Publish**
   - Summary grid:
     - Title, subject, type, duration.
     - Total questions, total marks.
     - Difficulty (string from step 1).
   - Scrollable preview of all questions + marks.
   - Animated alert (“Once published, this test will be visible to all students.”).
   - **Publish** button:
     - Saves test to `tests/{testId}` in RTDB.
     - Saves all questions to global `questions` collection with a `testId` reference.

### 2.5 Student Test Experience

Pages under `src/pages/student`:

- `StudentDashboard.tsx` – overview of tests, progress, recent results.
- `TestInstructions.tsx` – pre‑test instructions screen.
- `TestInterface.tsx` – main test‑taking UI.
  - Shows questions, supports MCQ, fill‑in‑the‑blank, and free‑text answers.
  - Handles timer based on `duration`.
- `TestResult.tsx` – summary of scores after submission.
- `AcademicHistory.tsx` – list of past tests and results.
- `PracticeHub.tsx` – practice‑style activities (if configured).

---

## 3. AI Question Generation (OpenRouter)

### 3.1 Overview

AI logic lives primarily in:

- Component: `src/components/teacher/AIQuestionGenerator.tsx`
- Helper: `src/lib/openrouter-helper.ts`
- Firebase config: `config/openrouter/apiKey` OR legacy `config/openrouterKey` in RTDB.

The flow:

1. Teacher opens AI Question Generator dialog from the Questions step.
2. Dialog checks RTDB to see if an OpenRouter key exists.
3. Teacher sets **counts and marks** per type:
   - MCQ, Fill in the Blank, Short Answer, Long Answer.
4. Component calculates **total marks** from AI vs **available marks** in the test so far.
5. On **Generate**:
   - Validates marks do not exceed available total.
   - Builds a detailed prompt from:
     - Selected chapters’ titles and content.
     - Subject name.
     - Question type counts + marks.
     - (Can be extended to include difficulty & special instructions.)
   - Calls `callOpenRouterWithFallback` from `openrouter-helper`.
   - Parses the JSON response into internal `Question` objects.
   - Sends them back to the wizard via `onQuestionsGenerated`.

### 3.2 OpenRouter Helper & Fallback Models

File: `src/lib/openrouter-helper.ts`

- Reads API key from **Firebase Realtime Database**:
  - Preferred: `config/openrouter/apiKey`
  - Fallback: `config/openrouterKey` (legacy path)
- Exports `callOpenRouterWithFallback(params)`:
  - Takes `systemMessage`, `userMessage`, `temperature`, `maxTokens`.
  - Tries models **in order**:
    1. `mistralai/devstral-2512:free`
    2. `qwen/qwen3-4b:free`
    3. `deepseek/deepseek-r1-0528:free`
    4. `meta-llama/llama-3.1-405b-instruct:free`
    5. `google/gemma-3-27b-it:free`
  - For each model:
    - Calls `https://openrouter.ai/api/v1/chat/completions`.
    - If it gets a provider‑level error (rate limit, 5xx, "no endpoints", overloaded, unavailable) it logs the error and tries the **next** model.
    - Non‑retryable errors (401/403, invalid JSON, etc.) are thrown immediately.
  - If all models fail, throws a final descriptive error.

### 3.3 AI Question Generator UI

Key behaviors:

- Shows **config status**: green if API key is found, red otherwise.
- Allows setting counts and marks **with number inputs** (no sliders).
- Live mark calculation:
  - `Marks to Generate = sum(count[type] * marks[type])`.
  - Compares with `Available Marks = totalMarks - currentQuestionMarks`.
  - Shows an alert if marks exceed available marks and disables the Generate button.
- Nice progress UI:
  - Animated galaxy + stars.
  - Progress bar and stage messages like “Preparing chapter content…”, “Generating questions with AI…”.
- On success:
  - Shows completion animation and short success toast.
  - Automatically closes after a short delay.
- On error:
  - Returns to config view.
  - Shows a clean error toast with human‑friendly message.

---

## 4. Firebase Structure

### 4.1 Realtime Database Paths

Common paths used by the app:

- `users/{uid}`
  - `email`
  - `displayName`
  - `phone`
  - `role`: `'teacher' | 'student'`
  - `createdAt`

- `subjects/{subjectId}`
  - `id`
  - `name`
  - `createdAt`
  - (optionally) `chapters`: array or map of chapters.

- `chapters/{chapterId}` (global fallback)
  - `id`
  - `subjectId`
  - `title`
  - `content`
  - `createdAt`

- `tests/{testId}`
  - `id`
  - `title`
  - `subjectId`
  - `subjectName`
  - `chapterIds: string[]`
  - `duration`
  - `totalMarks`
  - `type` (weekly/monthly/quiz/etc.)
  - `difficulty` (`easy | medium | hard`)
  - `specialInstructions`
  - `published: boolean`
  - `createdAt`

- `questions/{questionId}`
  - `id`
  - `testId`
  - `type`: `'mcq' | 'fillBlank' | 'shortAnswer' | 'longAnswer'`
  - `text`
  - `options?`
  - `correctAnswer?`
  - `marks`

- `submissions/{submissionId}`
  - `id`
  - `testId`
  - `studentId`
  - `studentName`
  - `answers[]`: `{ questionId, answer }`
  - `mcqScore`, `fillBlankScore`, `totalAutoScore`
  - Optional manual marks per question & final score
  - `status`: `'pending' | 'graded'`
  - `submittedAt`
  - `teacherRemarks?`

- `config/openrouter/apiKey`
  - OpenRouter API key (preferred path).

- `config/openrouterKey`
  - Legacy path for OpenRouter API key (still supported).

### 4.2 Firebase Setup

Firebase initialization lives in `src/lib/firebase.ts`:

- Sets up the Firebase app via `initializeApp(firebaseConfig)`.
- Exports `auth`, `database`.
- Contains reusable functions for:
  - Register / login / logout / reset password.
  - CRUD for subjects, chapters, tests, questions, submissions.
  - Query helpers like `getChaptersBySubject`, `getSubmissionsByStudent`, etc.

---

## 5. Tech Stack

- **Frontend**: React 18 + TypeScript
- **Bundler/Dev**: Vite 7
- **Routing**: `react-router-dom`
- **UI**: shadcn‑ui (Radix UI primitives + Tailwind CSS)
- **Styling**: Tailwind CSS, `tailwind-merge`, `tailwindcss-animate`
- **Icons**: `lucide-react`
- **Forms**: `react-hook-form`, `zod`, `@hookform/resolvers`
- **State / Data**:
  - Firebase Realtime Database
  - `@tanstack/react-query` for async data handling (where used)
- **Drag & Drop**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (used in question re‑ordering logic in the wizard).
- **Charts**: `recharts` (for analytics / dashboards).
- **AI**: OpenRouter Chat Completions API.

Dev tooling:

- TypeScript 5
- ESLint 9
- Vite React SWC plugin
- `lovable-tagger` (for Lovable dev experience)

---

## 6. Getting Started (From Scratch)

### 6.1 Prerequisites

- Node.js (LTS) + npm.
- A Firebase project with Realtime Database and Authentication enabled.
- An OpenRouter account and API key.

### 6.2 Clone and Install

```sh
# Clone the repo
git clone <YOUR_GIT_URL>
cd nexus-learn-portal-main

# Install dependencies
npm install
```

### 6.3 Configure Firebase

1. Copy your Firebase config (apiKey, authDomain, databaseURL, etc.).
2. Open `src/lib/firebase.ts` and update `firebaseConfig` if needed.
3. Make sure **Realtime Database** is in **test or proper rules** mode that allows your app to read paths listed in section 4.

### 6.4 Configure OpenRouter

In **Realtime Database**:

- Preferred (new) path:

```text
config
  openrouter
    apiKey: "sk-or-..."
```

- If you already have the old path, it is still supported:

```text
config
  openrouterKey: "sk-or-..."
```

The AI generator checks the new path first and then falls back to the legacy key.

### 6.5 Run Dev Server

```sh
npm run dev
```

Default dev URL (from `vite.config.ts`):

- `http://localhost:8080/`

---

## 7. Current Status (What Has Been Done So Far)

As of this README version:

- npm vulnerabilities have been fixed (Vite upgraded, audit clean).
- AI Question Generator:
  - Uses **OpenRouter with multiple fallback models**.
  - Handles network / provider errors gracefully.
  - Strong JSON parsing and validation for generated questions.
  - Respects total marks constraints and prevents over‑allocation.
- Test Creation Wizard:
  - 3‑step UX is working.
  - Uses **number inputs** (not sliders) for AI counts and marks.
  - Tracks difficulty + special instructions.
  - Review screen has animated callout.
- Drag & drop dependencies (`@dnd-kit/*`) installed for question ordering.
- Teacher and student auth flows and main dashboards are wired to Firebase.

---

## 8. Project Structure / File Tree

High‑level tree (excluding `node_modules` and build outputs):

```text
nexus-learn-portal-main/
├─ public/
│  └─ ... static assets (favicons, logos, etc.)
├─ src/
│  ├─ components/
│  │  ├─ layout/
│  │  │  ├─ AppSidebar.tsx
│  │  │  ├─ DashboardLayout.tsx
│  │  │  └─ Header.tsx
│  │  ├─ teacher/
│  │  │  └─ AIQuestionGenerator.tsx
│  │  ├─ ui/        # shadcn-ui primitives
│  │  │  ├─ accordion.tsx
│  │  │  ├─ alert.tsx
│  │  │  ├─ alert-dialog.tsx
│  │  │  ├─ badge.tsx
│  │  │  ├─ button.tsx
│  │  │  ├─ calendar.tsx
│  │  │  ├─ card.tsx
│  │  │  ├─ checkbox.tsx
│  │  │  ├─ dialog.tsx
│  │  │  ├─ dropdown-menu.tsx
│  │  │  ├─ form.tsx
│  │  │  ├─ input.tsx
│  │  │  ├─ label.tsx
│  │  │  ├─ navigation-menu.tsx
│  │  │  ├─ popover.tsx
│  │  │  ├─ progress.tsx
│  │  │  ├─ radio-group.tsx
│  │  │  ├─ select.tsx
│  │  │  ├─ sheet.tsx
│  │  │  ├─ sidebar.tsx
│  │  │  ├─ slider.tsx
│  │  │  ├─ tabs.tsx
│  │  │  ├─ textarea.tsx
│  │  │  ├─ toast.tsx / toaster.tsx
│  │  │  └─ ... many more primitives
│  │  ├─ NavLink.tsx
│  │  ├─ ProtectedRoute.tsx
│  │  └─ TestCard.tsx
│  │
│  ├─ hooks/
│  │  ├─ use-mobile.tsx
│  │  └─ useAuth.tsx
│  │
│  ├─ lib/
│  │  ├─ firebase.ts       # Firebase config + DB helpers
│  │  ├─ openrouter-helper.ts
│  │  └─ utils.ts
│  │
│  ├─ pages/
│  │  ├─ Index.tsx          # Landing / redirect page
│  │  ├─ NotFound.tsx
│  │  ├─ Settings.tsx
│  │  ├─ auth/
│  │  │  ├─ StudentAuth.tsx
│  │  │  └─ TeacherAuth.tsx
│  │  ├─ student/
│  │  │  ├─ AcademicHistory.tsx
│  │  │  ├─ PracticeHub.tsx
│  │  │  ├─ StudentClass.tsx
│  │  │  ├─ StudentDashboard.tsx
│  │  │  ├─ SubmissionConfirmation.tsx
│  │  │  ├─ TestDetails.tsx
│  │  │  ├─ TestInstructions.tsx
│  │  │  ├─ TestInterface.tsx
│  │  │  └─ TestResult.tsx
│  │  ├─ teacher/
│  │  │  ├─ ManageClasses.tsx
│  │  │  ├─ ManageStudents.tsx
│  │  │  ├─ ManageSubjects.tsx
│  │  │  ├─ ManageTests.tsx
│  │  │  ├─ QuestionBuilder.tsx
│  │  │  ├─ SubmissionReview.tsx
│  │  │  ├─ SubmissionsList.tsx
│  │  │  ├─ TeacherDashboard.tsx
│  │  │  └─ TestCreationWizard.tsx
│  │  └─ ... any additional route pages
│  │
│  ├─ main.tsx             # React root, router provider, layout
│  └─ index.css / globals  # Tailwind base styles
│
├─ eslint.config.js
├─ index.html
├─ package.json
├─ package-lock.json
├─ postcss.config.js
├─ tailwind.config.ts
├─ tsconfig.json / tsconfig.*.json
├─ vite.config.ts
├─ README.md              # Lovable default README
└─ README2.md             # This detailed project README
```

> Note: The tree above is simplified to highlight the important project files. Some utility/config files may be omitted for brevity, but the main structure is represented.

---

## 9. Next Steps / Ideas

- Thread **difficulty** and **special instructions** directly into the AI prompt so the generator tailors questions more strongly.
- Add student‑facing view of special instructions on the test instructions screen.
- Implement drag‑and‑drop ordering of questions in the wizard using `@dnd-kit`.
- Add more analytics to teacher dashboard using `recharts` (accuracy per topic, time spent, etc.).
- Harden Firebase security rules for production.

---

If you need this README kept in sync with future features, treat it as the source of truth for documentation and update it along with feature work.
