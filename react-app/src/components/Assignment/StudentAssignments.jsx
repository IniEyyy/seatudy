import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './studentAssignments.css';

const statusClass = (status) => {
  if (status === 'On Time') return 'on-time';
  if (status === 'Late') return 'late';
  return 'not-submitted';
};

function StudentAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchAssignments = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('http://localhost:5000/api/student/assignments', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load assignments');
        setAssignments(await res.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [token]);

  if (!token) return <p>Please login to see your assignments.</p>;
  if (loading) return <p>Loading assignments...</p>;
  if (error) return <p className="assignments-error">{error}</p>;

  return (
    <div className="student-assignments">
      <h2>My Assignments</h2>

      {assignments.length === 0 ? (
        <p>No assignments yet. Enroll in a course to get started.</p>
      ) : (
        <table className="assignments-table">
          <thead>
            <tr>
              <th>Assignment</th>
              <th>Course</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Score</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((assignment) => (
              <tr key={assignment.id}>
                <td>
                  <strong>{assignment.title}</strong>
                  <p className="assignment-desc">{assignment.description}</p>
                </td>
                <td>{assignment.course_title}</td>
                <td>{new Date(assignment.due_date).toLocaleString()}</td>
                <td>
                  <span className={`status ${statusClass(assignment.status)}`}>
                    {assignment.status}
                  </span>
                </td>
                <td>{assignment.score ?? '-'}</td>
                <td>
                  <Link
                    className="open-course-link"
                    to={`/dashboard/student/courses/${assignment.course_id}`}
                  >
                    Open Course
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default StudentAssignments;
