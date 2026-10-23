import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FaArrowLeft,
  FaClipboardList,
  FaEdit,
  FaFileAlt,
  FaTrashAlt,
} from 'react-icons/fa';
import './instructorCourse.css';
import AddMaterialForm from './AddMaterialForm';
import { useToast } from '../../contexts/ToastContext';
import AddAssignmentForm from './AddAssignmentForm';
import EditAssignmentForm from './EditAssignmentForm.jsx';

const API = 'http://localhost:5000';

function ViewCourseDetail() {
  const { id } = useParams();
  const { showToast } = useToast();
  const [course, setCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingAssignment, setEditingAssignment] = useState(null);

  const token = localStorage.getItem('token');

  const fetchDetail = useCallback(async () => {
    setError('');
    try {
      const res = await fetch(`${API}/api/instructor/courses/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not load this course');

      setCourse(data.course || data);
      setMaterials(data.materials || data.course?.materials || []);
      setAssignments(data.assignments || data.course?.assignments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleDeleteMaterial = async (materialId) => {
    if (!window.confirm('Delete this material? Learners will lose access to the file.')) return;

    try {
      const res = await fetch(`${API}/api/instructor/courses/${id}/materials/${materialId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not delete material');
      showToast('Material deleted.', 'success');
      fetchDetail();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm('Delete this assignment? Submitted answers will be removed too.')) return;

    try {
      const res = await fetch(`${API}/api/instructor/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not delete assignment');
      showToast('Assignment deleted.', 'success');
      fetchDetail();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="page ic-page">
        <div className="loading-block">
          <span className="spinner" />
          <span>Loading course…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page ic-page">
        <div className="ic-alert" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-secondary" onClick={fetchDetail}>
            Try again
          </button>
        </div>
        <Link to="/dashboard/instructor/courses" className="btn btn-secondary">
          <FaArrowLeft />
          Back to courses
        </Link>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="page ic-page">
        <div className="empty-state">
          <strong>Course not found.</strong>
          <span>It may have been deleted or you do not have access to it.</span>
          <Link to="/dashboard/instructor/courses" className="btn btn-sm btn-secondary">
            Back to courses
          </Link>
        </div>
      </div>
    );
  }

  const price = Number(course.price) || 0;

  return (
    <div className="page ic-page">
      <Link to="/dashboard/instructor/courses" className="ic-back">
        <FaArrowLeft />
        Back to courses
      </Link>

      <header className="ic-hero">
        <div>
          <div className="ic-tags">
            <span className="catalog-tag">{course.category || 'General'}</span>
            <span className="catalog-level">{course.level || 'All levels'}</span>
            <span className={`ic-price ${price === 0 ? 'is-free' : ''}`}>
              {price > 0 ? `$${price.toFixed(2)}` : 'Free'}
            </span>
          </div>
          <h1>{course.title}</h1>
          <p>{course.description}</p>
        </div>

        <div className="ic-hero-stats">
          <div>
            <strong>{materials.length}</strong>
            <span>Materials</span>
          </div>
          <div>
            <strong>{assignments.length}</strong>
            <span>Assignments</span>
          </div>
          <div>
            <strong>{course.student_count ?? 0}</strong>
            <span>Learners</span>
          </div>
        </div>
      </header>

      <section className="ic-section">
        <header className="ic-section-head">
          <div>
            <span className="eyebrow">Content</span>
            <h2>Materials</h2>
          </div>
          <span className="ic-count">{materials.length} file{materials.length === 1 ? '' : 's'}</span>
        </header>

        {materials.length === 0 ? (
          <div className="empty-state">
            <strong>No materials yet.</strong>
            <span>Upload lecture notes, slides, or videos so learners have something to open.</span>
          </div>
        ) : (
          <ul className="ic-list">
            {materials.map((mat) => (
              <li key={mat.id} className="ic-item">
                <span className="ic-item-icon">
                  <FaFileAlt />
                </span>
                <div className="ic-item-body">
                  <a
                    href={`${API}${mat.link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ic-item-title"
                  >
                    {mat.title}
                  </a>
                  {mat.content && <p>{mat.content}</p>}
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost ic-delete"
                  onClick={() => handleDeleteMaterial(mat.id)}
                  aria-label={`Delete ${mat.title}`}
                >
                  <FaTrashAlt />
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}

        <AddMaterialForm courseId={id} onAdd={fetchDetail} />
      </section>

      <section className="ic-section">
        <header className="ic-section-head">
          <div>
            <span className="eyebrow">Assessment</span>
            <h2>Assignments</h2>
          </div>
          <span className="ic-count">
            {assignments.length} assignment{assignments.length === 1 ? '' : 's'}
          </span>
        </header>

        {assignments.length === 0 ? (
          <div className="empty-state">
            <strong>No assignments yet.</strong>
            <span>Create one below, set a due date, then grade submissions as they come in.</span>
          </div>
        ) : (
          <ul className="ic-list">
            {assignments.map((asg) => (
              <li key={asg.id} className="ic-item">
                <span className="ic-item-icon is-amber">
                  <FaClipboardList />
                </span>
                <div className="ic-item-body">
                  <strong className="ic-item-title">{asg.title}</strong>
                  {asg.description && <p>{asg.description}</p>}
                  <span className="ic-item-meta">
                    Due{' '}
                    {new Date(asg.due_date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="ic-item-actions">
                  <Link
                    to={`/dashboard/instructor/assignments/${asg.id}/submissions`}
                    className="btn btn-sm btn-secondary"
                  >
                    Submissions
                  </Link>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setEditingAssignment(asg)}
                  >
                    <FaEdit />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost ic-delete"
                    onClick={() => handleDeleteAssignment(asg.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {editingAssignment ? (
          <EditAssignmentForm
            assignment={editingAssignment}
            onClose={() => setEditingAssignment(null)}
            onUpdate={fetchDetail}
          />
        ) : (
          <AddAssignmentForm courseId={id} onAdd={fetchDetail} />
        )}
      </section>
    </div>
  );
}

export default ViewCourseDetail;
