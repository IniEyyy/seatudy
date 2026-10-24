import { useEffect, useState } from 'react';
import { FaStar } from 'react-icons/fa';
import './reviewList.css';
import { apiFetch } from '../../../lib/api';



const initials = (name = '?') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

function ReviewList({ courseId, refresh }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const fetchReviews = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiFetch(`/api/reviews/${courseId}`);
        const data = await res.json().catch(() => []);
        if (!res.ok) throw new Error(data.message || 'Could not load reviews');
        if (active) setReviews(Array.isArray(data) ? data : []);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchReviews();
    return () => {
      active = false;
    };
  }, [courseId, refresh]);

  if (loading) {
    return (
      <div className="rv-list">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="rv-skeleton skeleton" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="rv-error">{error}</div>;
  }

  if (reviews.length === 0) {
    return (
      <div className="empty-state">
        <strong>No reviews yet.</strong>
        <span>Be the first learner to share how this course went.</span>
      </div>
    );
  }

  return (
    <ul className="rv-list">
      {reviews.map((review, index) => (
        <li key={review.id || index} className="rv-item">
          <span className="rv-avatar">{initials(review.username)}</span>
          <div className="rv-body">
            <div className="rv-head">
              <strong>{review.username}</strong>
              <span className="rv-stars-static" aria-label={`${review.rating} out of 5`}>
                {Array.from({ length: 5 }).map((_, star) => (
                  <FaStar key={star} className={star < review.rating ? 'is-active' : ''} />
                ))}
              </span>
            </div>
            <p>{review.comment}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default ReviewList;
