import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowRight, FaPlus, FaStar, FaUsers } from 'react-icons/fa';
import './instructorCourses.css';
import EditCourseForm from './EditCourseForm';
import CreateCourseForm from './CreateCourseForm';
import { useToast } from '../../contexts/ToastContext';

function InstructorCourses() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  const fetchCourses = async (showSkeleton = true) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (showSkeleton) setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/instructor/courses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch courses');
      setCourses(await res.json());
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      if (showSkeleton) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleDelete = async (courseId) => {
    const token = localStorage.getItem('token');
    if (!window.confirm('Delete this course and all of its content?')) return;

    try {
      const res = await fetch(`http://localhost:5000/api/instructor/courses/${courseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete');
      showToast('Course deleted.', 'success');
      fetchCourses(false);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="page my-courses">
      <header className="teach-header">
        <div>
          <span className="eyebrow">Teaching</span>
          <h1>Your courses</h1>
          <p>Create new material, update assignments, and keep an eye on learner activity.</p>
        </div>
        <button type="button" className="btn create-course-btn" onClick={() => setCreatingCourse(true)}>
          <FaPlus />
          Create course
        </button>
      </header>

      {error && (
        <div className="courses-alert" role="alert">
          <span>{error}</span>
        </div>
      )}

      {creatingCourse && (
        <CreateCourseForm
          onClose={() => setCreatingCourse(false)}
          onUpdate={() => fetchCourses(false)}
        />
      )}

      {editingCourse && (
        <EditCourseForm
          course={editingCourse}
          onClose={() => setEditingCourse(null)}
          onUpdate={() => fetchCourses(false)}
        />
      )}

      {loading ? (
        <div className="teach-grid">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="teach-card skeleton" key={index} style={{ minHeight: 230 }} />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="empty-state">
          <strong>You have not created a course yet.</strong>
          <span>Start with a clear title and syllabus — you can add materials and assignments next.</span>
          <button type="button" className="btn btn-sm" onClick={() => setCreatingCourse(true)}>
            Create your first course
          </button>
        </div>
      ) : (
        <div className="teach-grid">
          {courses.map((course) => (
            <article key={course.id} className="teach-card">
              <div className="teach-card-top">
                <span className="catalog-tag">{course.category || 'General'}</span>
                <span className="catalog-level">{course.level}</span>
              </div>
              <h2>{course.title}</h2>
              <p className="teach-description">{course.description}</p>

              <div className="teach-meta">
                <span>
                  <FaUsers />
                  {course.student_count ?? 0} learners
                </span>
                <span>
                  <FaStar />
                  {Number(course.rating_avg) ? Number(course.rating_avg).toFixed(1) : 'New'}
                </span>
                <span className="teach-price">
                  {Number(course.price) > 0 ? `$${Number(course.price).toFixed(2)}` : 'Free'}
                </span>
              </div>

              <div className="teach-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => setEditingCourse(course)}
                >
                  Edit details
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost teach-delete"
                  onClick={() => handleDelete(course.id)}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="btn btn-sm teach-open"
                  onClick={() => navigate(`/dashboard/instructor/courses/${course.id}`)}
                >
                  Open
                  <FaArrowRight />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default InstructorCourses;
