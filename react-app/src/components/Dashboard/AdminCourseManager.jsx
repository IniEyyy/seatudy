import { useCallback, useEffect, useState } from 'react';
import { FaChevronLeft, FaChevronRight, FaPen, FaPlus, FaSearch, FaTrash } from 'react-icons/fa';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { apiFetch } from '../../lib/api';
import AdminCourseForm from './AdminCourseForm';
import './adminDashboard.css';
import './adminCourseManager.css';

const PAGE_SIZE = 10;

const SORT_OPTIONS = {
  newest: { sort: 'created_at', order: 'desc' },
  oldest: { sort: 'created_at', order: 'asc' },
  title: { sort: 'title', order: 'asc' },
  learners: { sort: 'student_count', order: 'desc' },
  rating: { sort: 'rating_avg', order: 'desc' },
  price: { sort: 'price', order: 'desc' },
};

const formatPrice = (value) => (Number(value) > 0 ? `$${Number(value).toFixed(2)}` : 'Free');
const formatRating = (value) => (Number(value) ? Number(value).toFixed(1) : 'New');

function AdminCourseManager() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [courses, setCourses] = useState([]);
  const [summary, setSummary] = useState({ courses: 0, instructors: 0, learners: 0 });
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [instructors, setInstructors] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [instructorFilter, setInstructorFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [sortValue, setSortValue] = useState('newest');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    apiFetch('/api/admin/courses/instructors')
      .then(async (res) => {
        if (!res.ok) return [];
        const data = await res.json().catch(() => []);
        return Array.isArray(data) ? data : [];
      })
      .then((data) => {
        if (active) setInstructors(data);
      })
      .catch(() => {
        if (active) setInstructors([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const loadCourses = useCallback(
    async (showSkeleton = true) => {
      if (showSkeleton) setLoading(true);
      try {
        const sort = SORT_OPTIONS[sortValue] || SORT_OPTIONS.newest;
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
          sort: sort.sort,
          order: sort.order,
        });
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (instructorFilter) params.set('instructor', instructorFilter);
        if (levelFilter) params.set('level', levelFilter);

        const res = await apiFetch(`/api/admin/courses?${params.toString()}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Could not load courses');

        setCourses(data.courses || []);
        setPagination(data.pagination || { page: 1, total: 0, totalPages: 1 });
        if (data.summary) setSummary(data.summary);
        if (data.pagination?.page && data.pagination.page !== page) {
          setPage(data.pagination.page);
        }
        setError('');
      } catch (err) {
        setError(err.message);
      } finally {
        if (showSkeleton) setLoading(false);
      }
    },
    [debouncedSearch, instructorFilter, levelFilter, page, sortValue]
  );

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const resetFilters = () => {
    setSearch('');
    setInstructorFilter('');
    setLevelFilter('');
    setSortValue('newest');
    setPage(1);
  };

  const openCreate = () => {
    setEditingCourse(null);
    setFormOpen(true);
  };

  const openEdit = (course) => {
    setEditingCourse(course);
    setFormOpen(true);
  };

  const handleDelete = async (course) => {
    const approved = await confirm({
      title: 'Delete this course?',
      message: `“${course.title}” and its materials, assignments, enrolments, and purchases will be removed. This cannot be undone.`,
      confirmLabel: 'Delete course',
      tone: 'danger',
    });
    if (!approved) return;

    setDeletingId(course.id);
    try {
      const res = await apiFetch(`/api/admin/courses/${course.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not delete this course');
      showToast('Course deleted.', 'success');
      await loadCourses(false);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const hasActiveFilters = search || instructorFilter || levelFilter || sortValue !== 'newest';
  const canCreate = instructors.length > 0;

  return (
    <div className="page admin-dashboard">
      <header className="admin-header">
        <div>
          <span className="eyebrow">Catalogue</span>
          <h1>Course manager</h1>
          <p>Create listings, assign instructors, and keep every course on Seatudy up to date.</p>
        </div>
        <div className="manager-header-actions">
          <span className="admin-count">
            {pagination.total} course{pagination.total === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            className="btn"
            onClick={openCreate}
            disabled={!canCreate}
            title={canCreate ? 'Create a course' : 'Promote an account to instructor first'}
          >
            <FaPlus />
            New course
          </button>
        </div>
      </header>

      <section className="manager-summary" aria-label="Course summary">
        <div>
          <strong>{summary.courses}</strong>
          <span>Courses</span>
        </div>
        <div>
          <strong>{summary.instructors}</strong>
          <span>Instructors</span>
        </div>
        <div>
          <strong>{summary.learners}</strong>
          <span>Learners</span>
        </div>
      </section>

      {!canCreate && (
        <div className="courses-alert" role="status">
          <span>Promote an account to instructor before creating a course.</span>
        </div>
      )}

      {error && (
        <div className="courses-alert" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => loadCourses()}>
            Try again
          </button>
        </div>
      )}

      <section className="admin-panel">
        <div className="admin-toolbar">
          <div className="admin-search">
            <FaSearch />
            <input
              type="search"
              placeholder="Search title, category, or instructor"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search courses"
            />
          </div>

          <div className="admin-controls">
            <label>
              Instructor
              <select
                value={instructorFilter}
                onChange={(event) => {
                  setInstructorFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All instructors</option>
                {instructors.map((instructor) => (
                  <option key={instructor.id} value={instructor.id}>
                    {instructor.username}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Level
              <select
                value={levelFilter}
                onChange={(event) => {
                  setLevelFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All levels</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </label>

            <label>
              Sort
              <select
                value={sortValue}
                onChange={(event) => {
                  setSortValue(event.target.value);
                  setPage(1);
                }}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="title">Title A-Z</option>
                <option value="learners">Most learners</option>
                <option value="rating">Highest rated</option>
                <option value="price">Price: high to low</option>
              </select>
            </label>

            {hasActiveFilters && (
              <button type="button" className="manager-reset" onClick={resetFilters}>
                Reset
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">
            <span className="spinner" />
            <span>Loading courses...</span>
          </div>
        ) : courses.length === 0 ? (
          <div className="empty-state">
            <strong>No courses match this view.</strong>
            <span>Adjust the search or filters, or create the first listing.</span>
            {hasActiveFilters && (
              <button type="button" className="btn btn-sm btn-secondary" onClick={resetFilters}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table manager-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Instructor</th>
                    <th>Level</th>
                    <th>Price</th>
                    <th>Learners</th>
                    <th>Rating</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr key={course.id}>
                      <td>
                        <div className="manager-course">
                          <strong>{course.title}</strong>
                          <small>
                            {course.category || 'General'} · {course.material_count} materials ·{' '}
                            {course.assignment_count} assignments
                          </small>
                        </div>
                      </td>
                      <td>
                        <div className="manager-instructor">
                          <strong>{course.instructor_name}</strong>
                          <small>{course.instructor_email}</small>
                        </div>
                      </td>
                      <td>
                        <span className="manager-level">{course.level}</span>
                      </td>
                      <td className="manager-price">{formatPrice(course.price)}</td>
                      <td>{course.student_count ?? 0}</td>
                      <td className="manager-rating">{formatRating(course.rating_avg)}</td>
                      <td>
                        <div className="manager-actions">
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            onClick={() => openEdit(course)}
                          >
                            <FaPen />
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost manager-delete"
                            onClick={() => handleDelete(course)}
                            disabled={deletingId === course.id}
                          >
                            <FaTrash />
                            {deletingId === course.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-pagination">
              <span>
                Page {pagination.page} of {pagination.totalPages} - {pagination.total} total
              </span>
              <div>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={pagination.page <= 1}
                >
                  <FaChevronLeft /> Previous
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setPage((value) => value + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next <FaChevronRight />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {formOpen && (
        <AdminCourseForm
          course={editingCourse}
          instructors={instructors}
          onClose={() => {
            setFormOpen(false);
            setEditingCourse(null);
          }}
          onUpdate={() => loadCourses(false)}
        />
      )}
    </div>
  );
}

export default AdminCourseManager;
