import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { getCurrentUser } from './utils/auth';
import type { AuthUser } from './utils/auth';

import DashboardLayout from './layouts/DashboardLayout';

// Pages / Components
import LoginPage from './pages/LoginPage';
import EduvergeHomePage from './pages/EduvergeHomePage'; // ✅ Import Landing Page

import FacultyDashboard from './components/FacultyDashboard';
import AssessmentCreation from './components/AssessmentCreation';
import FacultyCourseMaterials from './components/FacultyCourseMaterials';
import StudentDashboard from './components/StudentDashboard';
import TestTaking from './components/TestTaking';
import ResultsPage from './components/ResultsPage';
import CoursePage from './components/CoursePage';
import ScoreCalculatorModule from './components/ScoreCalculator/ScoreCalculatorModule';
import AIAssistantModule from './components/AIAssistant/AIAssistantModule';
import {
  ChangePassword,
  UserProfile as UserProfileComponent,
} from './components/UserSettings';
import AdminDashboard from './components/Admin/AdminDashboardd';
import AdminUserManagement from './components/Admin/AdminUserManagement';
import AdminAnalytics from './components/Admin/AdminAnalytics';
import AdminSubmissions from './components/Admin/AdminSubmissions';
import ResultsSummary from './components/ResultsSummary';
import SessionLockGuard from './components/SessionLockGuard';
import FacultyStudentManagement from './components/FacultyStudentManagement';
import { ToastContainer } from 'react-toastify';

const convertAuthUserToComponentUser = (authUser: AuthUser): any => ({
  id: authUser.id,
  email: authUser.email,
  full_name: authUser.full_name,
  role: authUser.role,
  is_blocked: authUser.is_blocked,
  is_active: authUser.is_active,
  created_at: authUser.created_at,
});

const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('❌ Error checking user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const componentUser = user ? convertAuthUserToComponentUser(user) : null;

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        
        {/* ✅ ROOT PATH: Shows Landing Page if guest, redirects to Dashboard if logged in */}
        <Route 
          path="/" 
          element={
            !user ? (
              <EduvergeHomePage />
            ) : user.role === 'student' ? (
              <Navigate to="/student-dashboard" replace />
            ) : user.role === 'faculty' ? (
              <Navigate to="/faculty-dashboard" replace />
            ) : (
              <Navigate to="/admin" replace />
            )
          } 
        />

        {/* ✅ LOGIN: Redirects to Dashboard if already logged in */}
        <Route
          path="/login"
          element={
            !user ? (
              <LoginPage onLogin={checkUser} />
            ) : user.role === 'student' ? (
              <Navigate to="/student-dashboard" replace />
            ) : user.role === 'faculty' ? (
              <Navigate to="/faculty-dashboard" replace />
            ) : (
              <Navigate to="/admin" replace />
            )
          }
        />

        {/* ======================= ADMIN ROUTES ======================= */}
        <Route
          path="/admin"
          element={
            user && user.role === 'admin' ? (
              <DashboardLayout user={componentUser}>
                <AdminDashboard user={componentUser} />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/admin/users"
          element={
            user && user.role === 'admin' ? (
              <DashboardLayout user={componentUser}>
                <AdminUserManagement user={componentUser} />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/admin/analytics"
          element={
            user && user.role === 'admin' ? (
              <DashboardLayout user={componentUser}>
                <AdminAnalytics user={componentUser} />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/admin/submissions"
          element={
            user && user.role === 'admin' ? (
              <DashboardLayout user={componentUser}>
                <AdminSubmissions user={user} />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* ======================= STUDENT ROUTES ======================= */}
        <Route
          path="/student-dashboard"
          element={
            user && user.role === "student" ? (
              <DashboardLayout user={componentUser}>
                <StudentDashboard user={componentUser} />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/take-test/:assessmentId"
          element={
            user && user.role === 'student' ? (
              <SessionLockGuard>
                <TestTaking user={componentUser} />
              </SessionLockGuard>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/courses"
          element={
            user && user.role === 'student' ? (
              <DashboardLayout user={componentUser}>
                <CoursePage user={componentUser} />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/ai-assistant"
          element={
            user && user.role === 'student' ? (
              <AIAssistantModule user={componentUser} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/score-calculator"
          element={
            user && user.role === 'student' ? (
              <DashboardLayout user={componentUser}>
                <ScoreCalculatorModule />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* ======================= FACULTY ROUTES ======================= */}
        <Route
          path="/faculty-dashboard"
          element={
            user && user.role === "faculty" ? (
              <DashboardLayout user={componentUser}>
                <FacultyDashboard user={componentUser} />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/create-assessment"
          element={
            user && user.role === 'faculty' ? (
              <DashboardLayout user={componentUser}>
                <AssessmentCreation user={componentUser} />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/course-materials"
          element={
            user && user.role === 'faculty' ? (
              <DashboardLayout user={componentUser}>
                <FacultyCourseMaterials user={componentUser} />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/faculty/student"
          element={
            user && user.role === 'faculty' ? (
              <DashboardLayout user={componentUser}>
                <FacultyStudentManagement user={componentUser} />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* ======================= SHARED / RESULTS ======================= */}
        <Route
          path="/results/:submissionId"
          element={
            user ? (
              <DashboardLayout user={componentUser!}>
                <ResultsPage user={componentUser} />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/results-summary/:submissionId"
          element={
            user ? (
              <DashboardLayout user={componentUser!}>
                <ResultsSummary user={componentUser} />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* ======================= USER SETTINGS ======================= */}
        <Route
          path="/profile"
          element={
            user ? (
              <DashboardLayout user={componentUser!}>
                <UserProfileComponent />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/change-password"
          element={
            user ? (
              <DashboardLayout user={componentUser!}>
                <ChangePassword />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* ======================= CATCH-ALL ======================= */}
        {/* If route doesn't exist, redirect to root (which handles auth check) */}
        <Route path="*" element={<Navigate to="/" />} />
        
      </Routes>
      <ToastContainer position="bottom-right" autoClose={2000} />
    </Router>
  );
};

export default App;