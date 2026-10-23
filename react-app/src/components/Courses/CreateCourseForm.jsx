import { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { useToast } from '../../contexts/ToastContext';
import './CourseForm.css';

const EMPTY_FORM = {
  title: '',
  description: '',
  syllabus: '',
  category: '',
  price: 0,
  level: 'Beginner',
};

function CreateCourseForm({ onClose, onUpdate }) {
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    setSaving(true);
    try {
      const res = await fetch('http://localhost:5000/api/instructor/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to create course');

      setForm(EMPTY_FORM);
      showToast('Course created.', 'success');
      if (onUpdate) onUpdate();
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cf-overlay">
      <div className="cf-modal" role="dialog" aria-modal="true" aria-labelledby="cf-create-title">
        <header className="cf-head">
          <div>
            <span className="eyebrow">New course</span>
            <h2 id="cf-create-title">Create course</h2>
          </div>
          <button type="button" className="cf-close" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </header>

        <form className="cf-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Title</span>
            <input
              className="input"
              type="text"
              name="title"
              placeholder="e.g. React Fundamentals"
              value={form.title}
              onChange={handleChange}
              required
            />
          </label>

          <label className="field">
            <span>Description</span>
            <textarea
              className="input"
              name="description"
              placeholder="One paragraph on who this course is for and what they will build."
              value={form.description}
              onChange={handleChange}
              required
            />
          </label>

          <label className="field">
            <span>Syllabus</span>
            <textarea
              className="input"
              name="syllabus"
              placeholder="Topics covered, week by week."
              value={form.syllabus}
              onChange={handleChange}
              required
            />
          </label>

          <div className="cf-grid">
            <label className="field">
              <span>Price (USD)</span>
              <input
                className="input"
                type="number"
                name="price"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                required
              />
            </label>

            <label className="field">
              <span>Category</span>
              <input
                className="input"
                type="text"
                name="category"
                placeholder="e.g. Programming"
                value={form.category}
                onChange={handleChange}
                required
              />
            </label>

            <label className="field">
              <span>Level</span>
              <select className="input" name="level" value={form.level} onChange={handleChange}>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </label>
          </div>

          <div className="cf-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'Creating…' : 'Create course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateCourseForm;
