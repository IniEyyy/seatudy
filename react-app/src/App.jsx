import { lazy, Suspense, useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';

import Navbar from './components/Dashboard/Navbar/Navbar.jsx';
import ProtectedRoute from './components/Common/ProtectedRoute.jsx';
import ErrorBoundary from './components/Common/ErrorBoundary.jsx';
import { AuthContext } from './contexts/AuthContext';

const Register = lazy(() => import('./components/Auth/RegisterPage.jsx'));
const Login = lazy(() => import('./components/Auth/Login.jsx'));
const Logout = lazy(() => import('./components/Auth/Logout.jsx'));
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard.jsx'));
const AdminDashboard = lazy(() => import('./components/Dashboard/AdminDashboard.jsx'));
const TopUp = lazy(() => import('./components/Dashboard/TopUpBalance.jsx'));
const InstructorCourses = lazy(() => import('./components/Courses/InstructorCourses.jsx'));
const InstructorCourse = lazy(() => import('./components/Courses/InstructorCourse.jsx'));
const InstructorSubmissionsOverview = lazy(() => import('./components/Courses/InstructorSubmissionsOverview.jsx'));
const StudentCourses = lazy(() => import('./components/Courses/StudentCourses.jsx'));
const StudentCourse = lazy(() => import('./components/Courses/StudentCourse.jsx'));
const CourseCertificate = lazy(() => import('./components/Courses/CourseCertificate.jsx'));
const InstructorAssignmentSubmissions = lazy(() => import('./components/Courses/InstructorAssignmentSubmissions.jsx'));
const StudentAssignments = lazy(() => import('./components/Assignment/StudentAssignments.jsx'));
const NotFound = lazy(() => import('./components/NotFound.jsx'));

const AUTH_PATHS = ['/login', '/register', '/logout'];

const TITLES = {
  '/login': 'Sign in',
  '/register': 'Create account',
  '/logout': 'Signing out',
  '/dashboard': 'Dashboard',
  '/dashboard/courses': 'Course catalogue',
  '/dashboard/student/courses': 'My courses',
  '/dashboard/student/assignments': 'My assignments',
  '/dashboard/admin': 'Manage accounts',
  '/dashboard/instructor/courses': 'My courses',
  '/dashboard/instructor/submissions': 'Submissions',
  '/student/topup': 'Top up wallet',
};

function PageFallback() {
  return (
    <div className="loading-block">
      <span className="spinner" />
      <span>Loading page.</span>
    </div>
  );
}

function AppLayout() {
  const { token } = useContext(AuthContext);
  const location = useLocation();
  const isAuthPage = AUTH_PATHS.includes(location.pathname);

  useEffect(() => {
    const base = TITLES[location.pathname] || 'Seatudy';
    document.title = base === 'Seatudy' ? base : `${base} | Seatudy`;
  }, [location.pathname]);

  return (
    <div className="app-shell">
      {!isAuthPage && <Navbar />}
      <main className="app-main">
        <ErrorBoundary key={location.pathname}>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/logout" element={<Logout />} />

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/courses"
                element={
                  <ProtectedRoute>
                    <StudentCourses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/courses/:id"
                element={
                  <ProtectedRoute>
                    <StudentCourse editable={false} token={token} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard/admin"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard/instructor/courses"
                element={
                  <ProtectedRoute roles={['instructor']}>
                    <InstructorCourses token={token} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/instructor/courses/:id"
                element={
                  <ProtectedRoute roles={['instructor']}>
                    <InstructorCourse editable token={token} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/instructor/submissions"
                element={
                  <ProtectedRoute roles={['instructor']}>
                    <InstructorSubmissionsOverview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/instructor/assignments/:assignmentId/submissions"
                element={
                  <ProtectedRoute roles={['instructor']}>
                    <InstructorAssignmentSubmissions />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/topup"
                element={
                  <ProtectedRoute roles={['student']}>
                    <TopUp />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/student/courses"
                element={
                  <ProtectedRoute roles={['student']}>
                    <StudentCourses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/student/assignments"
                element={
                  <ProtectedRoute roles={['student']}>
                    <StudentAssignments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/student/courses/:id"
                element={
                  <ProtectedRoute roles={['student']}>
                    <StudentCourse editable={false} token={token} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/student/courses/:id/certificate"
                element={
                  <ProtectedRoute roles={['student']}>
                    <CourseCertificate />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
