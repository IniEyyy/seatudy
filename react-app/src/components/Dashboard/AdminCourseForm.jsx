import { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { useToast } from '../../contexts/ToastContext';
import { apiFetch } from '../../lib/api';
import '../Courses/CourseForm.css';

function AdminCourseForm({ course, instructors, onClose, onUpdate }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    instructor_id: course?.instructor_id ? String(course.instructor_id) : '',
    title: course?.title || '',
    description: course?.description || '',
    syllabus: course?.syllabus || '',
    category: course?.category || '',
    price: course?.price ?? 0,
    level: course?.level || 'Beginner',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const res = await apiFetch(course ? `/api/admin/courses/${course.id}` : '/api/admin/courses', {
        method: course ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          instructor_id: Number(form.instructor_id),
          price: Number(form.price),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not save this course');

      showToast(course ? 'Course updated.' : 'Course created.', 'success');
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
      <div className="cf-modal" role="dialog" aria-modal="true" aria-labelledby="admin-course-form-title">
        <header className="cf-head">
          <div>
            <span className="eyebrow">{course ? 'Course settings' : 'New listing'}</span>
            <h2 id="admin-course-form-title">{course ? 'Edit course' : 'Create course'}</h2>
          </div>
          <button type="button" className="cf-close" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </header>

        <form className="cf-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Instructor</span>
            <select
              className="input"
              name="instructor_id"
              value={form.instructor_id}
              onChange={handleChange}
              required
            >
              <option value="">Choose an instructor</option>
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.username} ({instructor.email})
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Title</span>
            <input
              className="input"
              type="text"
              name="title"
              placeholder="e.g. React Fundamentals"
              value={form.title}
              onChange={handleChange}
              maxLength={200}
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
                onChange={handleChange}
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
                maxLength={80}
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

          {instructors.length === 0 && (
            <p className="cf-note">Promote an account to instructor before creating a course.</p>
          )}

          <div className="cf-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={saving || instructors.length === 0}>
              {saving ? 'Saving…' : course ? 'Save changes' : 'Create course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminCourseForm;
