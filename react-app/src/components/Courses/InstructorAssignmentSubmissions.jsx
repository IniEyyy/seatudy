import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Pie } from 'react-chartjs-2';
import './instructorAssignmentSubmission.css';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

function InstructorAssignmentSubmissions() {
  const { assignmentId } = useParams();
  const token = localStorage.getItem('token');

  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState(null);
  const [assignment, setAssignment] = useState(null);

  useEffect(() => {
    if (!assignmentId || !token) return;

    fetch(`http://localhost:5000/api/instructor/assignments/${assignmentId}/submissions`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Server error');
        return res.json();
      })
      .then(data => {
        setAssignment(data.assignment);
        setSubmissions(data.submissions);
        setStats(data.stats);
      })
      .catch(err => console.error('Fetch error:', err));
  }, [assignmentId, token]);

  const handleScoreChange = async (submissionId, score) => {
    try {
      const res = await fetch(`http://localhost:5000/api/instructor/submissions/${submissionId}/score`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ score: Number(score) })
      });

      const data = await res.json();
      if (res.ok) {
        alert('Score updated!');
        setSubmissions(prev =>
          prev.map(s => s.submission_id === submissionId ? { ...s, score } : s)
        );
      } else {
        alert(data.message || 'Failed to update score');
      }
    } catch {
      alert('Error updating score');
    }
  };

  if (!stats || typeof stats.total !== 'number') {
    return <p>Loading submission data...</p>;
  }

  return (
    <div className="submission-table-container">
      <h2>Assignment: {assignment?.title}</h2>
      <p>Due Date: {new Date(assignment?.due_date).toLocaleDateString()}</p>

      <table className="submission-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Status</th>
            <th>Submitted At</th>
            <th>Answer</th>
            <th>Score</th>
            <th>Give Score</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((s, i) => (
            <tr key={i}>
              <td>{s.student_name}</td>
              <td>
                <span className={`status ${
                  s.status === 'On Time' ? 'on-time' :
                  s.status === 'Late' ? 'late' : 'not-submitted'
                }`}>
                  {s.status}
                </span>
              </td>
              <td>{s.submitted_at ? new Date(s.submitted_at).toLocaleString() : '-'}</td>
              <td>{s.content || '-'}</td>
              <td>{s.score ?? '-'}</td>
              <td>
                {s.submission_id && (
                  <input
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={s.score ?? ''}
                    onBlur={(e) => handleScoreChange(s.submission_id, e.target.value)}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {stats.total > 0 ? (
        <div className="submission-charts">
          <div className="progress-bar">
            <h4>Submission Progress</h4>
            <div className="progress-container">
                {stats.total > 0 && (
                    <>
                    <div
                        className="progress-submitted"
                        style={{ width: `${(stats.submitted / stats.total) * 100}%` }}
                    >
                        {/* {stats.submitted} on time */}
                    </div>
                    <div
                        className="progress-late"
                        style={{ width: `${(stats.late / stats.total) * 100}%` }}
                    >
                        {/* {stats.late} late */}
                    </div>
                    <div
                        className="progress-notYet"
                        style={{ width: `${(stats.notYet / stats.total) * 100}%` }}
                    >
                        {/* {stats.notYet} not Submitted */}
                    </div>
                    </>
                )}
                {stats.total === 0 && (
                    <div className="progress-empty">No student data available.</div>
                )}
            </div>
          </div>

          <div className="pie-chart">
            <h4>Submission Breakdown</h4>
            <Pie
                data={{
                    labels: ['On Time', 'Late', 'Not Submitted'],
                    datasets: [{
                    data: stats.total > 0
                        ? [stats.submitted, stats.late, stats.notYet]
                        : [1, 0, 0], // fallback kosong
                    backgroundColor: ['#4caf50', '#fbc02d', '#e53935'],
                    }]
                }}
                options={{
                    responsive: true,
                    plugins: {
                    legend: {
                        position: 'bottom'
                    }
                    }
                }}
            />
          </div>
        </div>
      ) : (
        <p>No enrolled students to display statistics.</p>
      )}

      <div className="submission-stats">
        <p><strong>Total Students:</strong> {stats.total}</p>
        <p><strong>On Time:</strong> {stats.submitted}</p>
        <p><strong>Late:</strong> {stats.late}</p>
        <p><strong>Not Submitted:</strong> {stats.notYet}</p>
      </div>
    </div>
  );
}

export default InstructorAssignmentSubmissions;
