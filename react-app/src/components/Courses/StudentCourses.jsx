import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FaSearch, FaSlidersH } from 'react-icons/fa';
import { AuthContext } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import CourseCard from './CourseCard.jsx';
import './studentCourses.css';
import { apiFetch } from '../../lib/api';



function StudentCourses() {
  const { user, token, setUser } = useContext(AuthContext);
  const { showToast } = useToast();
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [boughtCourses, setBoughtCourses] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [sortBy, setSortBy] = useState('popular');

  const isStudent = user?.role === 'student';

  const loadData = useCallback(
    async (showSkeleton = true) => {
      if (!token) return;
      if (showSkeleton) setLoading(true);
      setError('');

      try {
        if (!isStudent) {
          const res = await apiFetch(`/api/public/courses`);
          if (!res.ok) throw new Error('Could not load the course catalogue');
          setAvailableCourses(await res.json());
          return;
        }

        const res = await apiFetch(`/api/student/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Could not load your courses');
        setEnrolledCourses(data.enrolled || []);
        setBoughtCourses(data.bought || []);
        setAvailableCourses(data.available || []);
      } catch (err) {
        setError(err.message);
      } finally {
        if (showSkeleton) setLoading(false);
      }
    },
    [isStudent, token]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshProfile = async () => {
    const res = await apiFetch(`/api/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const profile = await res.json();
      setUser(profile);
    }
  };

  const handleBuy = async (courseId) => {
    setBusyId(courseId);
    try {
      const res = await apiFetch(`/api/student/buy/${courseId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Purchase failed');
      showToast(data.message || 'Course purchased.', 'success');
      await Promise.all([loadData(false), refreshProfile()]);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleEnroll = async (courseId) => {
    setBusyId(courseId);
    try {
      const res = await apiFetch(`/api/student/enroll/${courseId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Enrollment failed');
      showToast(data.message || 'You are enrolled.', 'success');
      await loadData(false);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const categories = useMemo(
    () => [...new Set(availableCourses.map((course) => course.category).filter(Boolean))].sort(),
    [availableCourses]
  );

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = availableCourses.filter((course) => {
      const matchesQuery =
        !query ||
        course.title?.toLowerCase().includes(query) ||
        course.description?.toLowerCase().includes(query) ||
        course.category?.toLowerCase().includes(query);

      return (
        matchesQuery &&
        (categoryFilter === '' || course.category === categoryFilter) &&
        (levelFilter === '' || course.level === levelFilter) &&
        (ratingFilter === 0 || (Number(course.rating_avg) || 0) >= ratingFilter)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'price-asc') return Number(a.price) - Number(b.price);
      if (sortBy === 'price-desc') return Number(b.price) - Number(a.price);
      if (sortBy === 'rating') return (Number(b.rating_avg) || 0) - (Number(a.rating_avg) || 0);
      if (sortBy === 'newest') return b.id - a.id;
      return (b.student_count || 0) - (a.student_count || 0);
    });
  }, [availableCourses, categoryFilter, levelFilter, ratingFilter, search, sortBy]);

  const hasActiveFilters =
    search || categoryFilter || levelFilter || ratingFilter || sortBy !== 'popular';

  const resetFilters = () => {
    setSearch('');
    setCategoryFilter('');
    setLevelFilter('');
    setRatingFilter(0);
    setSortBy('popular');
  };

  const detailPath = (course) =>
    isStudent ? `/dashboard/student/courses/${course.id}` : `/dashboard/courses/${course.id}`;

  const renderGrid = (courses, status) => (
    <div className="catalog-grid">
      {courses.map((course) => (
        <CourseCard
          key={course.id}
          course={course}
          status={status}
          detailPath={detailPath(course)}
          onBuy={handleBuy}
          onEnroll={handleEnroll}
          busy={busyId === course.id}
        />
      ))}
    </div>
  );

  return (
    <div className="page courses-page">
      <header className="courses-header">
        <div>
          <span className="eyebrow">{isStudent ? 'My learning' : 'Catalogue'}</span>
          <h1>{isStudent ? 'Your courses, in one place' : 'Explore the course catalogue'}</h1>
          <p>
            {isStudent
              ? 'Pick up an active course, finish an enrolment, or find your next subject.'
              : 'A read-only view of every published course, updated live from the platform.'}
          </p>
        </div>
        {isStudent && !loading && (
          <div className="courses-summary">
            <div>
              <strong>{enrolledCourses.length}</strong>
              <span>Enrolled</span>
            </div>
            <div>
              <strong>{boughtCourses.length}</strong>
              <span>Ready to enrol</span>
            </div>
            <div>
              <strong>{availableCourses.length}</strong>
              <span>Available</span>
            </div>
          </div>
        )}
      </header>

      {error && (
        <div className="courses-alert" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => loadData()}>
            Try again
          </button>
        </div>
      )}

      {isStudent && (
        <>
          <section className="courses-section">
            <div className="section-heading">
              <h2>In progress</h2>
              <span>{enrolledCourses.length} enrolled</span>
            </div>

            {loading ? (
              <div className="catalog-grid">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div className="catalog-card skeleton" key={index} style={{ minHeight: 250 }} />
                ))}
              </div>
            ) : enrolledCourses.length === 0 ? (
              <div className="empty-state">
                <strong>No active courses yet.</strong>
                <span>Buy or claim a course below, then enrol to unlock materials and assignments.</span>
                <a className="btn btn-sm btn-secondary" href="#available-courses">
                  Browse available courses
                </a>
              </div>
            ) : (
              renderGrid(enrolledCourses, 'enrolled')
            )}
          </section>

          {boughtCourses.length > 0 && (
            <section className="courses-section">
              <div className="section-heading">
                <h2>Ready to enrol</h2>
                <span>Already purchased</span>
              </div>
              {renderGrid(boughtCourses, 'bought')}
            </section>
          )}
        </>
      )}

      <section className="courses-section" id="available-courses">
        <div className="section-heading">
          <h2>{isStudent ? 'Available courses' : 'All courses'}</h2>
          <span>
            {filteredCourses.length} result{filteredCourses.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="catalog-toolbar">
          <div className="catalog-search">
            <FaSearch />
            <input
              type="search"
              placeholder="Search by title, topic, or category"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search courses"
            />
          </div>

          <div className="catalog-filters">
            <span className="filters-label">
              <FaSlidersH />
              Filter
            </span>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Category">
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)} aria-label="Level">
              <option value="">All levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>

            <select
              value={ratingFilter}
              onChange={(event) => setRatingFilter(Number(event.target.value))}
              aria-label="Rating"
            >
              <option value={0}>Any rating</option>
              <option value={4}>4 stars & up</option>
              <option value={3}>3 stars & up</option>
              <option value={2}>2 stars & up</option>
            </select>

            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort">
              <option value="popular">Most popular</option>
              <option value="newest">Newest first</option>
              <option value="rating">Highest rated</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>

            {hasActiveFilters && (
              <button type="button" className="filter-reset" onClick={resetFilters}>
                Reset
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="catalog-grid">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="catalog-card skeleton" key={index} style={{ minHeight: 250 }} />
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="empty-state">
            <strong>No courses match those filters.</strong>
            <span>Try a different search term or clear the filters.</span>
            {hasActiveFilters && (
              <button type="button" className="btn btn-sm btn-secondary" onClick={resetFilters}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          renderGrid(filteredCourses, isStudent ? 'available' : 'browse')
        )}
      </section>
    </div>
  );
}

export default StudentCourses;
