import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Pie } from 'react-chartjs-2';
import {
  FaArrowLeft,
  FaCheckCircle,
  FaClock,
  FaDownload,
  FaHourglassHalf,
  FaUsers,
} from 'react-icons/fa';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import './instructorAssignmentSubmission.css';
import { useToast } from '../../contexts/ToastContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import { apiFetch, downloadFile } from '../../lib/api';

ChartJS.register(ArcElement, Tooltip, Legend);

const statusTone = (status) => {
  if (status === 'On Time') return 'on-time';
  if (status === 'Late') return 'late';
  return 'not-submitted';
};

function SubmissionRow({ submission, selected, onToggle, onSaved }) {
  const { showToast } = useToast();
  const [score, setScore] = useState(submission.score ?? '');
  const [feedback, setFeedback] = useState(submission.feedback || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setScore(submission.score ?? '');
    setFeedback(submission.feedback || '');
  }, [submission.submission_id, submission.score, submission.feedback]);

  const save = async () => {
    if (score === '') {
      showToast('Enter a score before saving.', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch(`/api/instructor/submissions/${submission.submission_id}/score`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: Number(score), feedback }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to save grade');
      onSaved(submission.submission_id, { score: Number(score), feedback });
      showToast('Grade saved.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (file) => {
    try {
      await downloadFile(`/api/files/submissions/${file.id}`, file.file_name);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <tr>
      <td data-label="Select">
        {submission.submission_id ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(submission.submission_id)}
            aria-label={`Select ${submission.student_name}`}
          />
        ) : null}
      </td>
      <td data-label="Student">
        <strong>{submission.student_name}</strong>
      </td>
      <td data-label="Status">
        <span className={`isub-status is-${statusTone(submission.status)}`}>{submission.status}</span>
      </td>
      <td data-label="Submitted">
        {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : '-'}
      </td>
      <td data-label="Answer" className="isub-answer">
        {submission.content || '-'}
        {submission.files?.length > 0 && (
          <ul className="isub-files">
            {submission.files.map((file) => (
              <li key={file.id}>
                <button type="button" onClick={() => handleDownload(file)}>
                  <FaDownload /> {file.file_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </td>
      <td data-label="Score">
        {submission.submission_id ? (
          <input
            className="input isub-score"
            type="number"
            min="0"
            max="100"
            value={score}
            onChange={(event) => setScore(event.target.value)}
            aria-label={`Score for ${submission.student_name}`}
          />
        ) : (
          <span className="isub-muted">-</span>
        )}
      </td>
      <td data-label="Feedback">
        {submission.submission_id ? (
          <textarea
            className="input isub-feedback"
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="Optional feedback"
            aria-label={`Feedback for ${submission.student_name}`}
          />
        ) : (
          <span className="isub-muted">-</span>
        )}
      </td>
      <td data-label="Save">
        {submission.submission_id ? (
          <button type="button" className="btn btn-sm" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        ) : null}
      </td>
    </tr>
  );
}

function InstructorAssignmentSubmissions() {
  const { assignmentId } = useParams();
  const { showToast } = useToast();
  const { theme } = useContext(ThemeContext);

  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState([]);
  const [bulkScore, setBulkScore] = useState('');
  const [bulkFeedback, setBulkFeedback] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);

  const loadSubmissions = useCallback(async () => {
    if (!assignmentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await apiFetch(`/api/instructor/assignments/${assignmentId}/submissions`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not load submissions');

      setAssignment(data.assignment);
      setSubmissions(data.submissions || []);
      setStats(data.stats);
      setSelected([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const submittedRows = useMemo(
    () => submissions.filter((submission) => submission.submission_id),
    [submissions]
  );

  const allSelected =
    submittedRows.length > 0 && submittedRows.every((row) => selected.includes(row.submission_id));

  const toggleAll = () => {
    setSelected(allSelected ? [] : submittedRows.map((row) => row.submission_id));
  };

  const toggleOne = (id) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  };

  const handleSaved = (submissionId, grade) => {
    setSubmissions((current) =>
      current.map((row) =>
        row.submission_id === submissionId ? { ...row, ...grade } : row
      )
    );
  };

  const applyBulk = async () => {
    if (!selected.length) {
      showToast('Select at least one submission.', 'error');
      return;
    }
    const score = Number(bulkScore);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      showToast('Bulk score must be between 0 and 100.', 'error');
      return;
    }

    setBulkSaving(true);
    try {
      const res = await apiFetch('/api/instructor/submissions/bulk-grade', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grades: selected.map((submissionId) => ({
            submission_id: submissionId,
            score,
            feedback: bulkFeedback,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Bulk grading failed');
      showToast(data.message || 'Grades saved.', 'success');
      setBulkScore('');
      setBulkFeedback('');
      await loadSubmissions();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBulkSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page isub-page">
        <div className="loading-block">
          <span className="spinner" />
          <span>Loading submissions.</span>
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
                })}. Save scores and feedback per learner, or grade several at once.`
              : 'Save scores and feedback per learner, or grade several at once.'}
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

      {submittedRows.length > 0 && (
        <div className="isub-bulk">
          <strong>Bulk grade {selected.length ? `${selected.length} selected` : ''}</strong>
          <input
            className="input isub-score"
            type="number"
            min="0"
            max="100"
            placeholder="Score"
            value={bulkScore}
            onChange={(event) => setBulkScore(event.target.value)}
            aria-label="Bulk score"
          />
          <input
            className="input"
            placeholder="Shared feedback (optional)"
            value={bulkFeedback}
            onChange={(event) => setBulkFeedback(event.target.value)}
            aria-label="Bulk feedback"
          />
          <button type="button" className="btn btn-sm" onClick={applyBulk} disabled={bulkSaving}>
            {bulkSaving ? 'Applying...' : 'Apply to selected'}
          </button>
        </div>
      )}

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
                  <th>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all submitted students"
                    />
                  </th>
                  <th>Student</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Answer</th>
                  <th>Score</th>
                  <th>Feedback</th>
                  <th>Save</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission, index) => (
                  <SubmissionRow
                    key={submission.submission_id || `${submission.student_name}-${index}`}
                    submission={submission}
                    selected={selected.includes(submission.submission_id)}
                    onToggle={toggleOne}
                    onSaved={handleSaved}
                  />
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
                        color: theme === 'dark' ? '#a9b7cf' : '#475569',
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
