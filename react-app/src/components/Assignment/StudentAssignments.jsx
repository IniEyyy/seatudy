import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaClipboardList, FaClock, FaFileAlt, FaGraduationCap } from 'react-icons/fa';
import './studentAssignments.css';
import { apiFetch } from '../../lib/api';



const statusTone = (status) => {
  if (status === 'On Time') return 'on-time';
  if (status === 'Late') return 'late';
  return 'pending';
};

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const isDueSoon = (value) => {
  const due = new Date(value).getTime();
  const diff = due - Date.now();
  return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
};

function StudentAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  const loadAssignments = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await apiFetch(`/api/student/assignments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not load your assignments');
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const graded = assignments.filter((item) => item.score != null);
  const averageScore = graded.length
    ? (graded.reduce((sum, item) => sum + Number(item.score), 0) / graded.length).toFixed(1)
    : '—';
  const waiting = assignments.filter((item) => item.status !== 'On Time' && item.status !== 'Late').length;
  const dueSoon = assignments.filter((item) => isDueSoon(item.due_date)).length;

  return (
    <div className="page sa-page">
      <header className="sa-header">
        <div>
          <span className="eyebrow">Student workspace</span>
          <h1>My assignments</h1>
          <p>Everything you owe, everything you have submitted, and every score in one list.</p>
        </div>
        <Link to="/dashboard/student/courses" className="btn btn-secondary">
          Browse courses
        </Link>
      </header>

      {loading ? (
        <div className="sa-stats">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="sa-stat skeleton" style={{ minHeight: 96 }} />
          ))}
        </div>
      ) : (
        <div className="sa-stats">
          <article className="sa-stat">
            <span className="sa-stat-icon">
              <FaClipboardList />
            </span>
            <div>
              <strong>{assignments.length}</strong>
              <span>Total assignments</span>
            </div>
          </article>
          <article className="sa-stat">
            <span className="sa-stat-icon is-amber">
              <FaClock />
            </span>
            <div>
              <strong>{waiting}</strong>
              <span>Waiting on you</span>
            </div>
          </article>
          <article className="sa-stat">
            <span className="sa-stat-icon is-blue">
              <FaFileAlt />
            </span>
            <div>
              <strong>{dueSoon}</strong>
              <span>Due this week</span>
            </div>
          </article>
          <article className="sa-stat">
            <span className="sa-stat-icon is-green">
              <FaGraduationCap />
            </span>
            <div>
              <strong>{averageScore}</strong>
              <span>Average score</span>
            </div>
          </article>
        </div>
      )}

      {error && (
        <div className="sa-alert" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-secondary" onClick={loadAssignments}>
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div className="sa-table-card">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="sa-row-skeleton skeleton" />
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <div className="empty-state">
          <strong>No assignments yet.</strong>
          <span>Enrol in a course and your tasks will show up here.</span>
          <Link to="/dashboard/student/courses" className="btn btn-sm btn-secondary">
            Find a course
          </Link>
        </div>
      ) : (
        <div className="sa-table-card">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Assignment</th>
                <th>Course</th>
                <th>Due</th>
                <th>Status</th>
                <th>Score</th>
                <th aria-label="Action" />
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td data-label="Assignment">
                    <strong>{assignment.title}</strong>
                    {assignment.description && <span className="sa-desc">{assignment.description}</span>}
                  </td>
                  <td data-label="Course">{assignment.course_title}</td>
                  <td data-label="Due">
                    <span className={isDueSoon(assignment.due_date) ? 'sa-due is-soon' : 'sa-due'}>
                      {formatDate(assignment.due_date)}
                    </span>
                  </td>
                  <td data-label="Status">
                    <span className={`sa-status is-${statusTone(assignment.status)}`}>
                      {assignment.status}
                    </span>
                  </td>
                  <td data-label="Score">
                    <span>{assignment.score ?? '—'}</span>
                    {assignment.feedback && <span className="sa-feedback">{assignment.feedback}</span>}
                  </td>
                  <td data-label="Action" className="sa-action-cell">
                    <Link
                      to={`/dashboard/student/courses/${assignment.course_id}`}
                      className="btn btn-sm sa-open"
                    >
                      Open course
                      <FaArrowRight />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default StudentAssignments;
