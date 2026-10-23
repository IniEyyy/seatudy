import { Link } from 'react-router-dom';
import { FaStar, FaUsers } from 'react-icons/fa';
import './studentCourses.css';

function CourseCard({ course, status, detailPath, onBuy, onEnroll, busy }) {
  const isFree = Number(course.price) <= 0;
  const rating = Number(course.rating_avg) || 0;

  return (
    <article className={`catalog-card catalog-card-${status}`}>
      <div className="catalog-card-top">
        <span className="catalog-tag">{course.category || 'General'}</span>
        {course.level && <span className="catalog-level">{course.level}</span>}
      </div>

      <h3>{course.title}</h3>
      <p className="catalog-description">{course.description}</p>

      <div className="catalog-meta">
        <span title="Average rating">
          <FaStar />
          {rating ? rating.toFixed(1) : 'New'}
        </span>
        <span title="Students enrolled">
          <FaUsers />
          {course.student_count ?? 0}
        </span>
        <span className={`catalog-price${isFree ? ' free' : ''}`}>
          {isFree ? 'Free' : `$${Number(course.price).toFixed(2)}`}
        </span>
      </div>

      <div className="catalog-actions">
        <Link to={detailPath} className="catalog-link">
          View course
        </Link>

        {status === 'available' && (
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => onBuy(course.id)}
            disabled={busy}
          >
            {busy ? 'Purchasing…' : isFree ? 'Get course' : 'Buy course'}
          </button>
        )}

        {status === 'bought' && (
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => onEnroll(course.id)}
            disabled={busy}
          >
            {busy ? 'Enrolling…' : 'Enroll now'}
          </button>
        )}

        {status === 'enrolled' && (
          <span className="catalog-status">
            <span className="status-dot" />
            Enrolled
          </span>
        )}
      </div>
    </article>
  );
}

export default CourseCard;
