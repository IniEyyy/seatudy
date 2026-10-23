import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Pie } from 'react-chartjs-2';
import {
  FaArrowLeft,
  FaCheckCircle,
  FaClock,
  FaHourglassHalf,
  FaUsers,
} from 'react-icons/fa';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import './instructorAssignmentSubmission.css';
import { useToast } from '../../contexts/ToastContext';

ChartJS.register(ArcElement, Tooltip, Legend);

const API = 'http://localhost:5000';

const statusTone = (status) => {
  if (status === 'On Time') return 'on-time';
  if (status === 'Late') return 'late';
  return 'not-submitted';
};

function InstructorAssignmentSubmissions() {
  const { assignmentId } = useParams();
  const token = localStorage.getItem('token');
  const { showToast } = useToast();

  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSubmissions = useCallback(async () => {
    if (!assignmentId || !token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API}/api/instructor/assignments/${assignmentId}/submissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not load submissions');

      setAssignment(data.assignment);
      setSubmissions(data.submissions || []);
      setStats(data.stats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [assignmentId, token]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const handleScoreChange = async (submissionId, score) => {
    try {
      const res = await fetch(`${API}/api/instructor/submissions/${submissionId}/score`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ score: Number(score) }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to update score');

      showToast('Score updated.', 'success');
      setSubmissions((prev) =>
        prev.map((s) => (s.submission_id === submissionId ? { ...s, score } : s))
      );
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="page isub-page">
        <div className="loading-block">
          <span className="spinner" />
          <span>Loading submissions…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page isub-page">
        <div className="isub-alert" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-secondary" onClick={loadSubmissions}>
            Try again
          </button>
        </div>
        <Link to="/dashboard/instructor/submissions" className="btn btn-secondary">
          <FaArrowLeft />
          Back to submissions
        </Link>
      </div>
    );
  }

  const safeStats = {
    total: stats?.total ?? 0,
    submitted: stats?.submitted ?? 0,
    late: stats?.late ?? 0,
    notYet: stats?.notYet ?? 0,
  };

  const percent = (value) => (safeStats.total ? Math.round((value / safeStats.total) * 100) : 0);

  return (
    <div className="page isub-page">
      <Link to="/dashboard/instructor/submissions" className="isub-back">
        <FaArrowLeft />
        Back to submissions
      </Link>

      <header className="isub-header">
        <div>
          <span className="eyebrow">Grading</span>
          <h1>{assignment?.title || 'Assignment submissions'}</h1>
          <p>
            {assignment?.due_date
              ? `Due ${new Date(assignment.due_date).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}. Scores save when you leave the field.`
              : 'Scores save when you leave the field.'}
          </p>
        </div>
      </header>

      <div className="isub-stats">
        <article className="isub-stat">
          <span className="isub-stat-icon">
            <FaUsers />
          </span>
          <div>
            <strong>{safeStats.total}</strong>
            <span>Students</span>
          </div>
        </article>
        <article className="isub-stat">
          <span className="isub-stat-icon is-green">
            <FaCheckCircle />
          </span>
          <div>
            <strong>{safeStats.submitted}</strong>
            <span>On time</span>
          </div>
        </article>
        <article className="isub-stat">
          <span className="isub-stat-icon is-amber">
            <FaClock />
          </span>
          <div>
            <strong>{safeStats.late}</strong>
            <span>Late</span>
          </div>
        </article>
        <article className="isub-stat">
          <span className="isub-stat-icon is-red">
            <FaHourglassHalf />
          </span>
          <div>
            <strong>{safeStats.notYet}</strong>
            <span>Not submitted</span>
          </div>
        </article>
      </div>

      <div className="isub-card">
        {submissions.length === 0 ? (
          <div className="empty-state">
            <strong>No submissions to show.</strong>
            <span>Once learners submit, their answers and scores appear here.</span>
          </div>
        ) : (
          <div className="isub-table-wrap">
            <table className="isub-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Answer</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s, index) => (
                  <tr key={s.submission_id || `${s.student_name}-${index}`}>
                    <td data-label="Student">
                      <strong>{s.student_name}</strong>
                    </td>
                    <td data-label="Status">
                      <span className={`isub-status is-${statusTone(s.status)}`}>{s.status}</span>
                    </td>
                    <td data-label="Submitted">
                      {s.submitted_at ? new Date(s.submitted_at).toLocaleString() : '—'}
                    </td>
                    <td data-label="Answer" className="isub-answer">
                      {s.content || '—'}
                    </td>
                    <td data-label="Score">
                      {s.submission_id ? (
                        <input
                          className="input isub-score"
                          type="number"
                          min="0"
                          max="100"
                          defaultValue={s.score ?? ''}
                          onBlur={(e) => handleScoreChange(s.submission_id, e.target.value)}
                          aria-label={`Score for ${s.student_name}`}
                        />
                      ) : (
                        <span className="isub-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {safeStats.total > 0 ? (
        <div className="isub-charts">
          <section className="isub-chart-card">
            <h2>Submission progress</h2>
            <div className="isub-progress" role="img" aria-label="Submission progress">
              {safeStats.submitted > 0 && (
                <span
                  className="isub-progress-part is-submitted"
                  style={{ width: `${percent(safeStats.submitted)}%` }}
                />
              )}
              {safeStats.late > 0 && (
                <span
                  className="isub-progress-part is-late"
                  style={{ width: `${percent(safeStats.late)}%` }}
                />
              )}
              {safeStats.notYet > 0 && (
                <span
                  className="isub-progress-part is-missing"
                  style={{ width: `${percent(safeStats.notYet)}%` }}
                />
              )}
            </div>

            <ul className="isub-legend">
              <li>
                <span className="isub-dot is-submitted" />
                On time <strong>{safeStats.submitted}</strong>
              </li>
              <li>
                <span className="isub-dot is-late" />
                Late <strong>{safeStats.late}</strong>
              </li>
              <li>
                <span className="isub-dot is-missing" />
                Not submitted <strong>{safeStats.notYet}</strong>
              </li>
            </ul>
          </section>

          <section className="isub-chart-card isub-pie-card">
            <h2>Submission breakdown</h2>
            <div className="isub-pie">
              <Pie
                data={{
                  labels: ['On Time', 'Late', 'Not Submitted'],
                  datasets: [
                    {
                      data: [safeStats.submitted, safeStats.late, safeStats.notYet],
                      backgroundColor: ['#16a34a', '#f59e0b', '#dc2626'],
                      borderWidth: 0,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        boxWidth: 10,
                        boxHeight: 10,
                        usePointStyle: true,
                        font: { family: 'Manrope', size: 11 },
                        color: '#475569',
                      },
                    },
                  },
                }}
              />
            </div>
          </section>
        </div>
      ) : (
        <div className="empty-state">
          <strong>No enrolled students yet.</strong>
          <span>Statistics appear once at least one learner is enrolled in the course.</span>
        </div>
      )}
    </div>
  );
}

export default InstructorAssignmentSubmissions;
