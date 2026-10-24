import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  FaArrowLeft,
  FaCheckCircle,
  FaLock,
  FaStar,
  FaUserTie,
  FaUsers,
} from 'react-icons/fa';
import './studentCourse.css';
import ReviewList from './Review/ReviewList.jsx';
import ReviewForm from './Review/ReviewForm.jsx';
import ForumDiscussion from './Discussion/ForumDiscussion.jsx';
import AssignmentSubmitForm from '../Assignment/AssignmentSubmitForm.jsx';
import MaterialViewer from './MaterialViewer.jsx';
import { useToast } from '../../contexts/ToastContext';
import { apiFetch } from '../../lib/api';


const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'materials', label: 'Materials' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'review', label: 'Reviews' },
  { id: 'forum', label: 'Forum' },
];

function StudentCourse() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const { showToast } = useToast();

  const [user, setUser] = useState(null);
  const [course, setCourse] = useState(null);
  const [hasEnrolled, setHasEnrolled] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshReview, setRefreshReview] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const isStudent = user?.role === 'student';
  const isAdmin = user?.role === 'admin';
  const canBrowseContent = isStudent || isAdmin;
  const visibleTabs = isStudent
    ? TABS
    : TABS.filter((tab) => ['overview', 'review', 'forum'].includes(tab.id));

  useEffect(() => {
    const fetchCourseDetail = async () => {
      try {
        if (token) {
          const profileRes = await apiFetch('/api/profile', {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (profileRes.ok) {
            const userData = await profileRes.json();
            setUser(userData);

            if (userData.role === 'student') {
              const studentRes = await apiFetch(`/api/student/courses/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });

              if (studentRes.ok) {
                setCourse(await studentRes.json());
                setHasEnrolled(true);
                setHasPurchased(true);
                return;
              }
            }
          }
        }

        const publicRes = await apiFetch(`/api/public/courses/${id}`);
        if (!publicRes.ok) throw new Error('Course not found');
        setCourse(await publicRes.json());

        if (token) {
          const purchaseRes = await apiFetch(`/api/student/purchases/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (purchaseRes.ok) {
            const purchaseData = await purchaseRes.json();
            setHasPurchased(Boolean(purchaseData.purchased));
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to load course');
      }
    };

    fetchCourseDetail();
  }, [id, token, refreshKey]);

  const handleBuy = async () => {
    try {
      const res = await apiFetch(`/api/student/buy/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to purchase course');
      setHasPurchased(true);
      showToast(data.message || 'Course purchased.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleEnroll = async () => {
    try {
      const res = await apiFetch(`/api/student/enroll/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to enroll in course');

      const enrolledRes = await apiFetch(`/api/student/courses/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (enrolledRes.ok) {
        setCourse(await enrolledRes.json());
        setHasEnrolled(true);
        setHasPurchased(true);
      }
      showToast(data.message || 'You are enrolled.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (error) {
    return (
      <div className="page student-course-page">
        <div className="courses-alert" role="alert">
          <span>{error}</span>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
          Go back
        </button>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="page student-course-page">
        <div className="loading-block">
          <span className="spinner" />
          <span>Loading course...</span>
        </div>
      </div>
    );
  }

  const price = Number(course.price) || 0;
  const rating = Number(course.rating_avg) || 0;
  const courseLink = isStudent ? '/dashboard/student/courses' : '/dashboard/courses';
  const locked = isStudent && !(hasPurchased && hasEnrolled);

  const renderTabContent = () => {
    if (activeTab === 'overview') {
      return (
        <div className="sc-panel">
          <h2>About this course</h2>
          <p className="sc-syllabus">{course.syllabus || course.description}</p>
          <div className="sc-overview-grid">
            <div>
              <span>Materials</span>
              <strong>{course.materials?.length ?? 0}</strong>
            </div>
            <div>
              <span>Assignments</span>
              <strong>{course.assignments?.length ?? 0}</strong>
            </div>
            <div>
              <span>Level</span>
              <strong>{course.level || 'All levels'}</strong>
            </div>
          </div>

          {course.progress && (
            <div className="sc-progress">
              <div className="sc-progress-head">
                <strong>Course progress</strong>
                <span>{course.progress.percent}%</span>
              </div>
              <div className="sc-progress-bar" role="progressbar" aria-valuenow={course.progress.percent} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${course.progress.percent}%` }} />
              </div>
              <p>
                {course.progress.submittedAssignments} of {course.progress.totalAssignments} assignments submitted
                {course.progress.averageScore != null
                  ? ` - average score ${course.progress.averageScore}/100`
                  : ''}
              </p>
              {course.progress.certificateEligible && (
                <Link to={`/dashboard/student/courses/${course.id}/certificate`} className="btn btn-sm">
                  View certificate
                </Link>
              )}
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'materials') {
      return (
        <div className="sc-panel">
          <h2>Course materials</h2>
          {!course.materials?.length ? (
            <div className="empty-state">
              <strong>No materials uploaded yet.</strong>
              <span>Your instructor will add files here as the course progresses.</span>
            </div>
          ) : (
            <div className="sc-materials">
              {course.materials.map((material) => (
                <MaterialViewer key={material.id} material={material} />
              ))}
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'assignments') {
      return (
        <div className="sc-panel">
          <h2>Assignments</h2>
          {!course.assignments?.length ? (
            <div className="empty-state">
              <strong>No assignments yet.</strong>
              <span>New work will appear here when your instructor publishes it.</span>
            </div>
          ) : (
            <div className="sc-assignments">
              {course.assignments.map((assignment) => (
                <article key={assignment.id} className="sc-assignment">
                  <div className="sc-assignment-head">
                    <div>
                      <h3>{assignment.title}</h3>
                      <p>{assignment.description}</p>
                    </div>
                    <span className="sc-due">
                      Due{' '}
                      {new Date(assignment.due_date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <AssignmentSubmitForm
                    courseId={id}
                    assignmentId={assignment.id}
                    existingSubmission={assignment.submission_id ? assignment : null}
                    onSuccess={() => {
                      showToast('Assignment saved.', 'success');
                      setRefreshKey((value) => value + 1);
                    }}
                  />
                </article>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'review') {
      return (
        <div className="sc-panel sc-two-col">
          <div>
            <h2>{isStudent ? 'Write a review' : 'Reviews'}</h2>
            {isStudent ? (
              <ReviewForm
                courseId={course.id}
                onSuccess={() => setRefreshReview((value) => !value)}
              />
            ) : (
              <p className="sc-syllabus">
                Only enrolled students can submit reviews. You can still read what learners said.
              </p>
            )}
          </div>
          <div>
            <h2>Learner reviews</h2>
            <ReviewList courseId={course.id} refresh={refreshReview} />
          </div>
        </div>
      );
    }

    return (
      <div className="sc-panel">
        <h2>Course forum</h2>
        <ForumDiscussion courseId={course.id} />
      </div>
    );
  };

  return (
    <div className="page student-course-page">
      <Link to={courseLink} className="sc-back">
        <FaArrowLeft />
        Back to courses
      </Link>

      <section className="sc-hero">
        <div className="sc-hero-copy">
          <div className="sc-tags">
            <span className="catalog-tag">{course.category || 'General'}</span>
            <span className="catalog-level">{course.level || 'All levels'}</span>
            {hasEnrolled && (
              <span className="sc-enrolled">
                <FaCheckCircle />
                Enrolled
              </span>
            )}
          </div>
          <h1>{course.title}</h1>
          <p>{course.description}</p>
          <div className="sc-meta">
            <span>
              <FaStar />
              {rating ? `${rating.toFixed(1)} rating` : 'New course'}
            </span>
            <span>
              <FaUsers />
              {course.student_count ?? 0} learners
            </span>
            <span>
              <FaUserTie />
              {course.instructor_name || 'Seatudy instructor'}
            </span>
          </div>
        </div>

        <aside className="sc-purchase">
          <span className="sc-price">
            {hasEnrolled ? 'Owned' : price > 0 ? `$${price.toFixed(2)}` : 'Free'}
          </span>
          <span className="sc-price-note">
            {hasEnrolled
              ? price > 0
                ? `Purchased for $${price.toFixed(2)}`
                : 'Free course, full access'
              : price > 0
                ? 'One-time purchase'
                : 'No purchase required'}
          </span>

          {isStudent && !hasPurchased && (
            <button type="button" className="btn sc-cta" onClick={handleBuy}>
              Buy course
            </button>
          )}
          {isStudent && hasPurchased && !hasEnrolled && (
            <button type="button" className="btn sc-cta" onClick={handleEnroll}>
              Enrol now
            </button>
          )}
          {hasEnrolled && (
            <span className="sc-access">
              <FaCheckCircle />
              Full access unlocked
            </span>
          )}
          {!isStudent && user && (
            <span className="sc-role-note">Browsing as {user.role}</span>
          )}

          <ul className="sc-includes">
            <li>All course materials</li>
            <li>Assignments and feedback</li>
            <li>Reviews and discussion forum</li>
          </ul>
        </aside>
      </section>

      {!canBrowseContent ? (
        <div className="sc-locked">
          <FaLock />
          <div>
            <strong>Catalogue preview</strong>
            <span>
              Materials, assignments, reviews, and the forum are available to enrolled students.
            </span>
          </div>
        </div>
      ) : locked ? (
        <div className="sc-locked">
          <FaLock />
          <div>
            <strong>{hasPurchased ? 'One more step to unlock the course.' : 'This course is not unlocked yet.'}</strong>
            <span>
              {hasPurchased
                ? 'Enrol using the button above to open materials, assignments, reviews, and the forum.'
                : price > 0
                  ? 'Purchase the course to unlock its materials and assignments.'
                  : 'Claim this free course to unlock its materials and assignments.'}
            </span>
          </div>
        </div>
      ) : (
        <section className="sc-content">
          <div className="sc-tabs" role="tablist" aria-label="Course sections">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={activeTab === tab.id ? 'active' : ''}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="sc-tab-content" key={activeTab}>
            {renderTabContent()}
          </div>
        </section>
      )}
    </div>
  );
}

export default StudentCourse;
