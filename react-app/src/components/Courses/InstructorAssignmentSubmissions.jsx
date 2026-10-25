import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Doughnut } from 'react-chartjs-2';
import {
  FaArrowLeft,
  FaChartBar,
  FaChartPie,
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

const DONUT_PALETTES = {
  light: [
    ['#4ade80', '#15803d'],
    ['#fbbf24', '#d97706'],
    ['#f87171', '#dc2626'],
  ],
  dark: [
    ['#4ade80', '#16a34a'],
    ['#fcd34d', '#f59e0b'],
    ['#fca5a5', '#ef4444'],
  ],
};

function StatusLegend({ items, variant = 'grid' }) {
  return (
    <ul className={`isub-legend isub-legend-${variant}`}>
      {items.map((item) => (
        <li className={`isub-legend-item tone-${item.key}`} key={item.key}>
          <span className={`isub-dot is-${item.key}`} aria-hidden="true" />
          <span className="isub-legend-label">{item.label}</span>
          <span className="isub-legend-value">
            <strong>{item.value}</strong>
            <span>{item.percent}%</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function SubmissionBreakdown({ submitted, late, notYet, total, theme }) {
  const { data, options } = useMemo(() => {
    const palette = DONUT_PALETTES[theme === 'dark' ? 'dark' : 'light'];
    const surface = theme === 'dark' ? '#111a2c' : '#ffffff';
    const separated = [submitted, late, notYet].filter((value) => value > 0).length > 1;

    const data = {
      labels: ['On time', 'Late', 'Not submitted'],
      datasets: [
        {
          data: [submitted, late, notYet],
          backgroundColor: (context) => {
            const { ctx, chartArea } = context.chart;
            const [start, end] = palette[context.dataIndex] || palette[0];
            if (!chartArea) return start;

            const gradient = ctx.createLinearGradient(
              chartArea.left,
              chartArea.top,
              chartArea.right,
              chartArea.bottom
            );
            gradient.addColorStop(0, start);
            gradient.addColorStop(1, end);
            return gradient;
          },
          borderColor: surface,
          borderWidth: separated ? 4 : 0,
          borderRadius: separated ? 7 : 0,
          spacing: separated ? 2 : 0,
          hoverOffset: 9,
          hoverBorderColor: surface,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      radius: '94%',
      animation: { duration: 900, easing: 'easeOutQuart' },
      layout: { padding: 2 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: theme === 'dark' ? 'rgba(8, 13, 25, 0.96)' : 'rgba(15, 23, 42, 0.94)',
          titleColor: '#f8fafc',
          bodyColor: '#e2e8f0',
          borderColor: 'rgba(148, 163, 184, 0.24)',
          borderWidth: 1,
          cornerRadius: 10,
          padding: 12,
          displayColors: true,
          boxPadding: 5,
          usePointStyle: true,
          bodyFont: { family: 'Manrope', size: 12 },
          titleFont: { family: 'Manrope', size: 12, weight: '700' },
          callbacks: {
            label: (context) => {
              const value = context.parsed;
              const share = total ? Math.round((value / total) * 100) : 0;
              return ` ${context.label}: ${value} learner${value === 1 ? '' : 's'} (${share}%)`;
            },
          },
        },
      },
    };

    return { data, options };
  }, [submitted, late, notYet, total, theme]);

  return (
    <div
      className="isub-donut-wrap"
      role="img"
      aria-label={`Submission breakdown: ${submitted} on time, ${late} late, ${notYet} not submitted.`}
    >
      <Doughnut data={data} options={options} aria-hidden="true" />
      <div className="isub-donut-center" aria-hidden="true">
        <span>Total</span>
        <strong>{total}</strong>
        <span>learners</span>
      </div>
    </div>
  );
}

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
  const turnedIn = safeStats.submitted + safeStats.late;
  const turnInRate = percent(turnedIn);
  const legendItems = [
    {
      key: 'submitted',
      label: 'On time',
      value: safeStats.submitted,
      percent: percent(safeStats.submitted),
    },
    { key: 'late', label: 'Late', value: safeStats.late, percent: percent(safeStats.late) },
    {
      key: 'missing',
      label: 'Not submitted',
      value: safeStats.notYet,
      percent: percent(safeStats.notYet),
    },
  ];

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
          <section className="isub-chart-card isub-progress-card" aria-labelledby="isub-progress-title">
            <div className="isub-chart-head">
              <span className="isub-chart-icon is-green" aria-hidden="true">
                <FaChartBar />
              </span>
              <div className="isub-chart-title">
                <h2 id="isub-progress-title">Submission progress</h2>
                <p>How the class is tracking against the deadline.</p>
              </div>
            </div>

            <div className="isub-progress-hero">
              <strong className="isub-progress-value">
                {turnInRate}
                <span>%</span>
              </strong>
              <div className="isub-progress-copy">
                <span>Turn-in rate</span>
                <small>
                  {turnedIn} of {safeStats.total} learners have submitted
                </small>
              </div>
            </div>

            <div
              className="isub-progress"
              role="img"
              aria-label={`${safeStats.submitted} on time, ${safeStats.late} late, ${safeStats.notYet} not submitted`}
            >
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

            <StatusLegend items={legendItems} />

            <p className={`isub-chart-note ${safeStats.notYet ? 'is-warn' : 'is-ok'}`}>
              <span className="isub-note-dot" aria-hidden="true" />
              {safeStats.notYet
                ? `${safeStats.notYet} learner${safeStats.notYet === 1 ? '' : 's'} ${
                    safeStats.notYet === 1 ? 'has' : 'have'
                  } yet to submit.`
                : 'Every learner has submitted.'}
            </p>
          </section>

          <section className="isub-chart-card isub-pie-card" aria-labelledby="isub-breakdown-title">
            <div className="isub-chart-head">
              <span className="isub-chart-icon" aria-hidden="true">
                <FaChartPie />
              </span>
              <div className="isub-chart-title">
                <h2 id="isub-breakdown-title">Submission breakdown</h2>
                <p>Where the class stands right now.</p>
              </div>
              <span
                className="isub-chart-badge"
                aria-label={`${percent(safeStats.submitted)} percent on time`}
              >
                <strong>{percent(safeStats.submitted)}%</strong>
                <span aria-hidden="true">on time</span>
              </span>
            </div>

            <div className="isub-breakdown">
              <SubmissionBreakdown
                submitted={safeStats.submitted}
                late={safeStats.late}
                notYet={safeStats.notYet}
                total={safeStats.total}
                theme={theme}
              />
              <StatusLegend items={legendItems} variant="stack" />
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
