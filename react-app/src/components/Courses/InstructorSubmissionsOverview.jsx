import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './instructorSubmissionsOverview.css';

function InstructorSubmissionsOverview() {
  const token = localStorage.getItem('token');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    fetch('http://localhost:5000/api/instructor/submissions/overview', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load submissions');
        return res.json();
      })
      .then(data => setRows(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p className="submissions-message">Loading submissions...</p>;
  if (error) return <p className="submissions-message">{error}</p>;

  return (
    <div className="submissions-overview">
      <h2>Student Submissions</h2>
      <p className="submissions-subtitle">
        Summary of every assignment across your courses, based on each student&apos;s latest submission.
      </p>

      {rows.length === 0 ? (
        <p className="submissions-message">No assignments yet. Create one from a course first.</p>
      ) : (
        <div className="submissions-table-wrapper">
          <table className="submissions-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Assignment</th>
                <th>Due Date</th>
                <th>Submitted</th>
                <th>On Time</th>
                <th>Late</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const notSubmitted = Math.max(row.total_students - row.submitted, 0);
                return (
                  <tr key={row.assignment_id}>
                    <td>{row.course_title}</td>
                    <td>{row.title}</td>
                    <td>{row.due_date ? new Date(row.due_date).toLocaleDateString() : '-'}</td>
                    <td>
                      {row.submitted}/{row.total_students}
                      {notSubmitted > 0 && (
                        <span className="submissions-missing">{notSubmitted} missing</span>
                      )}
                    </td>
                    <td>{row.on_time}</td>
                    <td>{row.late}</td>
                    <td>
                      <Link
                        className="submissions-link"
                        to={`/dashboard/instructor/assignments/${row.assignment_id}/submissions`}
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default InstructorSubmissionsOverview;
