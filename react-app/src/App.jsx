import React, { useContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

import { AuthContext } from './contexts/AuthContext';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const { setUser } = useContext(AuthContext);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken && storedToken !== token) {
      setToken(storedToken);
    }
  }, [token]);

  return (
    <Router>
      <Navbar />
      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/courses" element={<StudentCourses />} />

        {/* ADMIN */}
        <Route path="/dashboard/admin" element={<AdminDashboard />} />

        {/* INSTRUCTOR */}
        <Route path="/dashboard/instructor/courses" element={<InstructorCourses token={token} />} />
        <Route path="/dashboard/instructor/courses/:id" element={<InstructorCourse editable token={token} />} />
        <Route path="/dashboard/instructor/submissions" element={<InstructorSubmissionsOverview />} />
        <Route
          path="/dashboard/instructor/assignments/:assignmentId/submissions"
          element={<InstructorAssignmentSubmissions />}
        />

        {/* STUDENT */}
        <Route
          path="/student/topup"
          element={
            <TopUp
              token={token}
              onTopUpSuccess={(newBalance) => {
                setUser(prev => ({ ...prev, balance: newBalance }));
              }}
            />
          }
        />
        <Route path="/dashboard/student/courses" element={<StudentCourses />} />
        <Route path="/dashboard/student/assignments" element={<StudentAssignments />} />
        <Route path="/dashboard/student/courses/:id" element={<StudentCourse editable={false} token={token} />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
