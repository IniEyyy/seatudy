import { useContext, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FaArrowLeft, FaPrint } from 'react-icons/fa';
import { AuthContext } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import './courseCertificate.css';

function CourseCertificate() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [course, setCourse] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/student/courses/${id}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Could not load this course');
        setCourse(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="page certificate-page">
        <div className="loading-block">
          <span className="spinner" />
          <span>Preparing certificate.</span>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="page certificate-page">
        <div className="courses-alert" role="alert">
          <span>{error || 'Course not found'}</span>
        </div>
        <Link to={`/dashboard/student/courses/${id}`} className="btn btn-secondary">
          <FaArrowLeft /> Back to course
        </Link>
      </div>
    );
  }

  if (!course.progress?.certificateEligible) {
    return (
      <div className="page certificate-page">
        <div className="empty-state">
          <strong>Certificate locked.</strong>
          <span>
            Submit every assignment and earn an average of at least 60/100 to unlock your certificate.
          </span>
          <Link to={`/dashboard/student/courses/${id}`} className="btn btn-sm btn-secondary">
            Back to course
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page certificate-page">
      <div className="certificate-actions">
        <Link to={`/dashboard/student/courses/${id}`} className="btn btn-secondary">
          <FaArrowLeft /> Back to course
        </Link>
        <button type="button" className="btn" onClick={() => window.print()}>
          <FaPrint /> Print / save as PDF
        </button>
      </div>

      <article className="certificate">
        <div className="certificate-brand">Seatudy</div>
        <p className="certificate-kicker">Certificate of completion</p>
        <h1>{user?.username}</h1>
        <p className="certificate-copy">has successfully completed</p>
        <h2>{course.title}</h2>
        <div className="certificate-meta">
          <div>
            <span>Average score</span>
            <strong>{course.progress.averageScore}/100</strong>
          </div>
          <div>
            <span>Assignments</span>
            <strong>{course.progress.totalAssignments}</strong>
          </div>
          <div>
            <span>Issued</span>
            <strong>
              {new Date().toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </strong>
          </div>
        </div>
        <p className="certificate-note">
          This certificate confirms completion of all graded assignments in this Seatudy course.
        </p>
      </article>
    </div>
  );
}

export default CourseCertificate;
