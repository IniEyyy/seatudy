import { useContext, useState } from 'react';
import { FaStar } from 'react-icons/fa';
import { AuthContext } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import './reviewForm.css';
import { apiFetch } from '../../../lib/api';


function ReviewForm({ courseId, onSuccess }) {
  const [rating, setRating] = useState(5);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { token } = useContext(AuthContext);
  const { showToast } = useToast();

  const activeRating = hovered || rating;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await apiFetch(`/api/reviews/${courseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, comment }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to submit review');

      showToast(data.message || 'Review submitted.', 'success');
      setRating(5);
      setComment('');
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rv-form">
      <div className="rv-rating">
        <span className="rv-label">Your rating</span>
        <div
          className="rv-stars"
          role="radiogroup"
          aria-label="Rating"
          onMouseLeave={() => setHovered(0)}
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} star${value === 1 ? '' : 's'}`}
              className={value <= activeRating ? 'is-active' : ''}
              onMouseEnter={() => setHovered(value)}
              onFocus={() => setHovered(value)}
              onBlur={() => setHovered(0)}
              onClick={() => setRating(value)}
            >
              <FaStar />
            </button>
          ))}
          <span className="rv-rating-value">{rating}.0</span>
        </div>
      </div>

      <label className="field">
        <span>Comment</span>
        <textarea
          className="input"
          placeholder="What worked for you? What could be better?"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          required
        />
      </label>

      <button type="submit" className="btn" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit review'}
      </button>
    </form>
  );
}

export default ReviewForm;
