import { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { useToast } from '../../contexts/ToastContext';
import './CourseForm.css';

function EditCourseForm({ course, onClose, onUpdate }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    title: course.title,
    description: course.description,
    syllabus: course.syllabus || '',
    price: course.price,
    level: course.level,
    category: course.category || '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    setSaving(true);
    try {
      const res = await fetch(`http://localhost:5000/api/instructor/courses/${course.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to update course');

      showToast('Course updated.', 'success');
      onUpdate();
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cf-overlay">
      <div className="cf-modal" role="dialog" aria-modal="true" aria-labelledby="cf-edit-title">
        <header className="cf-head">
          <div>
            <span className="eyebrow">Course settings</span>
            <h2 id="cf-edit-title">Edit course</h2>
          </div>
          <button type="button" className="cf-close" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </header>

        <form className="cf-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Title</span>
            <input className="input" type="text" name="title" value={form.title} onChange={handleChange} required />
          </label>

          <label className="field">
            <span>Description</span>
            <textarea
              className="input"
              name="description"
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
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditCourseForm;
