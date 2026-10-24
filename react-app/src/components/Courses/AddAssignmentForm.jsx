import { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import './addAssignmentForm.css';
import { apiFetch } from '../../lib/api';


function AddAssignmentForm({ courseId, onAdd }) {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    setSaving(true);
    try {
      const res = await apiFetch(`/api/instructor/courses/${courseId}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, description, due_date: dueDate }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not create assignment');
      showToast('Assignment added successfully.', 'success');
      onAdd();
      setTitle('');
      setDescription('');
      setDueDate('');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="af" onSubmit={handleSubmit}>
      <header className="af-head">
        <h3>Add assignment</h3>
        <p>Give learners a clear brief and a due date they can plan around.</p>
      </header>

      <div className="af-grid">
        <label className="field">
          <span>Title</span>
          <input
            className="input"
            type="text"
            placeholder="e.g. Build a reusable React card"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Due date</span>
          <input
            className="input"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </label>

        <label className="field af-full">
          <span>Description</span>
          <textarea
            className="input"
            placeholder="What should learners submit, and how will it be graded?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </label>
      </div>

      <div className="af-actions">
        <button type="submit" className="btn" disabled={saving}>
          {saving ? 'Creating…' : 'Create assignment'}
        </button>
      </div>
    </form>
  );
}

export default AddAssignmentForm;
