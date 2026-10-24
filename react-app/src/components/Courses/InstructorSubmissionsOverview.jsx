import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import './instructorSubmissionsOverview.css';
import { apiFetch } from '../../lib/api';


function InstructorSubmissionsOverview() {
  const token = localStorage.getItem('token');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    apiFetch('/api/instructor/submissions/overview', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load submissions');
        return res.json();
      })
      .then((data) => setRows(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const submittedTotal = rows.reduce((sum, row) => sum + Number(row.submitted || 0), 0);
  const missingTotal = rows.reduce(
    (sum, row) => sum + Math.max(Number(row.total_students || 0) - Number(row.submitted || 0), 0),
    0
  );
  const lateTotal = rows.reduce((sum, row) => sum + Number(row.late || 0), 0);

  return (
    <div className="page submissions-page">
      <header className="submissions-header">
        <div>
          <span className="eyebrow">Review queue</span>
          <h1>Student submissions</h1>
          <p>
            Every assignment across your courses, based on each student&apos;s latest submission.
          </p>
        </div>
        {!loading && rows.length > 0 && (
          <div className="submissions-summary">
            <div>
              <strong>{rows.length}</strong>
              <span>Assignments</span>
            </div>
            <div>
              <strong>{submittedTotal}</strong>
              <span>Submitted</span>
            </div>
            <div>
              <strong className={missingTotal ? 'warn' : ''}>{missingTotal}</strong>
              <span>Missing</span>
            </div>
            <div>
              <strong>{lateTotal}</strong>
              <span>Late</span>
            </div>
          </div>
        )}
      </header>

      {loading ? (
        <div className="submissions-loading">
          <span className="spinner" />
          <span>Loading submissions…</span>
        </div>
      ) : error ? (
        <div className="courses-alert" role="alert">
          <span>{error}</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <strong>No assignments yet.</strong>
          <span>Create an assignment from one of your courses to start collecting submissions.</span>
          <Link to="/dashboard/instructor/courses" className="btn btn-sm">
            Go to my courses
          </Link>
        </div>
      ) : (
        <div className="submissions-table-wrapper">
          <table className="submissions-table">
            <thead>
              <tr>
                <th>Course / assignment</th>
                <th>Due date</th>
                <th>Progress</th>
                <th>On time</th>
                <th>Late</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const total = Number(row.total_students || 0);
                const submitted = Number(row.submitted || 0);
                const missing = Math.max(total - submitted, 0);
                const percent = total > 0 ? Math.round((submitted / total) * 100) : 0;

                return (
                  <tr key={row.assignment_id}>
                    <td>
                      <span className="row-course">{row.course_title}</span>
                      <strong className="row-assignment">{row.title}</strong>
                    </td>
                    <td className="row-date">
                      {row.due_date ? new Date(row.due_date).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div className="progress-cell">
                        <div className="progress-track">
                          <span style={{ width: `${percent}%` }} />
                        </div>
                        <span className="progress-label">
                          {submitted}/{total}
                          {missing > 0 && <em>{missing} missing</em>}
                        </span>
                      </div>
                    </td>
                    <td>{row.on_time}</td>
                    <td>{row.late}</td>
                    <td>
                      <Link
                        className="btn btn-sm submissions-link"
                        to={`/dashboard/instructor/assignments/${row.assignment_id}/submissions`}
                      >
                        Review
                        <FaArrowRight />
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
