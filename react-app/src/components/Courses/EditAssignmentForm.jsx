import { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import './addAssignmentForm.css';
import { apiFetch } from '../../lib/api';


function EditAssignmentForm({ assignment, onClose, onUpdate }) {
  const { showToast } = useToast();
  const [title, setTitle] = useState(assignment.title);
  const [description, setDescription] = useState(assignment.description);
  const [dueDate, setDueDate] = useState(assignment.due_date.split('T')[0]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    setSaving(true);
    try {
      const res = await apiFetch(`/api/instructor/assignments/${assignment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, description, due_date: dueDate }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not update assignment');

      showToast('Assignment updated.', 'success');
      onUpdate();
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="af" onSubmit={handleSubmit}>
      <header className="af-head">
        <h3>Edit assignment</h3>
        <p>Update the brief or move the due date. Learners see changes immediately.</p>
      </header>

      <div className="af-grid">
        <label className="field">
          <span>Title</span>
          <input className="input" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>

        <label className="field">
          <span>Due date</span>
          <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
        </label>

        <label className="field af-full">
          <span>Description</span>
          <textarea
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </label>
      </div>

      <div className="af-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

export default EditAssignmentForm;
