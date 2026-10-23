import { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';

import Register from './components/Auth/RegisterPage.jsx';
import Login from './components/Auth/Login.jsx';
import Logout from './components/Auth/Logout.jsx';

import Dashboard from './components/Dashboard/Dashboard.jsx';
import Navbar from './components/Dashboard/Navbar/Navbar.jsx';
import AdminDashboard from './components/Dashboard/AdminDashboard.jsx';
import TopUp from './components/Dashboard/TopUpBalance';

import InstructorCourses from './components/Courses/InstructorCourses.jsx';
import InstructorCourse from './components/Courses/InstructorCourse.jsx';
import InstructorSubmissionsOverview from './components/Courses/InstructorSubmissionsOverview.jsx';
import StudentCourses from './components/Courses/StudentCourses.jsx';
import StudentCourse from './components/Courses/StudentCourse.jsx';
import InstructorAssignmentSubmissions from './components/Courses/InstructorAssignmentSubmissions.jsx';

import StudentAssignments from './components/Assignment/StudentAssignments.jsx';
import NotFound from './components/NotFound';
import ProtectedRoute from './components/Common/ProtectedRoute.jsx';

import { AuthContext } from './contexts/AuthContext';

const AUTH_PATHS = ['/login', '/register', '/logout'];

function AppLayout() {
  const { token } = useContext(AuthContext);
  const location = useLocation();
  const isAuthPage = AUTH_PATHS.includes(location.pathname);

  return (
    <div className="app-shell">
      {!isAuthPage && <Navbar />}
      <main className="app-main">
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

          <Route path="*" element={<NotFound />} />
        </Routes>
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
