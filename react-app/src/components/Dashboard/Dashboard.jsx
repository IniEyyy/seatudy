import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowRight,
  FaBookOpen,
  FaChartLine,
  FaClipboardList,
  FaCoins,
  FaGraduationCap,
  FaLayerGroup,
  FaPlay,
  FaStar,
  FaUsers,
  FaWallet,
} from 'react-icons/fa';
import { AuthContext } from '../../contexts/AuthContext';
import './dashboard.css';
import { apiFetch } from '../../lib/api';


const ROLE_COPY = {
  student: {
    label: 'Student workspace',
    headline: 'Keep your learning moving.',
    description: "Everything you're enrolled in, everything due next, and your progress in one place.",
    primary: { label: 'Browse courses', to: '/dashboard/student/courses' },
    secondary: { label: 'View assignments', to: '/dashboard/student/assignments' },
  },
  instructor: {
    label: 'Instructor workspace',
    headline: 'Teach with a clearer view.',
    description: 'Track your courses, see how learners are doing, and stay on top of work waiting for review.',
    primary: { label: 'Manage courses', to: '/dashboard/instructor/courses' },
    secondary: { label: 'Review submissions', to: '/dashboard/instructor/submissions' },
  },
  admin: {
    label: 'Admin workspace',
    headline: 'The platform at a glance.',
    description: 'Monitor accounts and manage every course on Seatudy from one place.',
    primary: { label: 'Manage users', to: '/dashboard/admin' },
    secondary: { label: 'Manage courses', to: '/dashboard/admin/courses' },
  },
};

const ROLE_LABEL = {
  student: 'Student',
  instructor: 'Instructor',
  admin: 'Administrator',
};

function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'S';
}

function firstName(name = '') {
  return name.trim().split(/\s+/)[0] || 'there';
}

function formatStat(value, format) {
  const number = Number(value) || 0;
  if (format === 'currency') return `$${number.toFixed(2)}`;
  if (format === 'rating') return number.toFixed(2);
  if (format === 'score') return `${Math.round(number)}/100`;
  return number.toLocaleString();
}

function Dashboard() {
  const { user, token, loading } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!token || !user) {
      setStatsLoading(false);
      return;
    }

    let active = true;
    setStatsLoading(true);
    setError('');

    apiFetch('/api/dashboard/stats', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.message || 'Could not load your dashboard');
        return payload;
      })
      .then((payload) => {
        if (active) setData(payload);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setStatsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, user, refreshKey]);

  if (loading) {
    return (
      <div className="loading-block">
        <span className="spinner" />
        <span>Preparing your workspace…</span>
      </div>
    );
  }

  const role = user?.role || 'student';
  const copy = ROLE_COPY[role] || ROLE_COPY.student;
  const stats = data?.stats || {};
  const recent = data?.recent || [];

  const statCards = {
    student: [
      { label: 'Enrolled courses', value: stats.enrolledCourses, icon: FaBookOpen, tone: 'blue', hint: 'Active this semester' },
      { label: 'Pending assignments', value: stats.pendingAssignments, icon: FaClipboardList, tone: 'amber', hint: 'Waiting for you' },
      { label: 'Average score', value: stats.averageScore, format: 'score', icon: FaChartLine, tone: 'mint', hint: `${stats.gradedSubmissions || 0} graded submissions` },
      { label: 'Wallet balance', value: stats.balance, format: 'currency', icon: FaWallet, tone: 'violet', hint: 'Ready for new courses' },
    ],
    instructor: [
      { label: 'Active courses', value: stats.courses, icon: FaBookOpen, tone: 'blue', hint: 'Published by you' },
      { label: 'Students reached', value: stats.students, icon: FaUsers, tone: 'violet', hint: 'Across all courses' },
      { label: 'Needs review', value: stats.pendingReviews, icon: FaClipboardList, tone: 'amber', hint: 'Ungraded submissions' },
      { label: 'Average rating', value: stats.averageRating, format: 'rating', icon: FaStar, tone: 'mint', hint: 'From learner reviews' },
    ],
    admin: [
      { label: 'Total users', value: stats.users, icon: FaUsers, tone: 'blue', hint: `${stats.students || 0} students / ${stats.instructors || 0} instructors` },
      { label: 'Courses', value: stats.courses, icon: FaLayerGroup, tone: 'violet', hint: 'In the catalogue' },
      { label: 'Enrollments', value: stats.enrollments, icon: FaGraduationCap, tone: 'mint', hint: 'Student-course connections' },
      { label: 'Course revenue', value: stats.revenue, format: 'currency', icon: FaCoins, tone: 'amber', hint: 'From completed purchases' },
    ],
  }[role] || [];

  const quickActions = {
    student: [
      { label: 'My courses', description: 'Continue a course or find something new.', to: '/dashboard/student/courses', icon: FaBookOpen },
      { label: 'Assignments', description: 'See what is due and what you have submitted.', to: '/dashboard/student/assignments', icon: FaClipboardList },
      { label: 'Top up wallet', description: 'Add funds before enrolling in a paid course.', to: '/student/topup', icon: FaWallet },
    ],
    instructor: [
      { label: 'My courses', description: 'Create a course, upload materials, and set assignments.', to: '/dashboard/instructor/courses', icon: FaBookOpen },
      { label: 'Submissions', description: 'Open the review queue across every assignment.', to: '/dashboard/instructor/submissions', icon: FaClipboardList },
    ],
    admin: [
      { label: 'Manage users', description: 'Promote instructors or demote accounts.', to: '/dashboard/admin', icon: FaUsers },
      { label: 'Course manager', description: 'Create, edit, reassign, or remove course listings.', to: '/dashboard/admin/courses', icon: FaLayerGroup },
    ],
  }[role] || [];

  if (role === 'student' && data?.continueCourse) {
    quickActions.unshift({
      label: 'Continue learning',
      description: data.continueCourse.title,
      to: data.continueCourse.href,
      icon: FaPlay,
    });
  }

  return (
    <div className="page dashboard-page">
      <section className="dash-hero">
        <div className="dash-hero-content">
          <span className="dash-eyebrow">{copy.label}</span>
          <h1>
            Welcome back, <span>{firstName(user?.username)}</span>.
          </h1>
          <p>{copy.description}</p>
          <div className="dash-hero-actions">
            <Link to={copy.primary.to} className="btn">
              {copy.primary.label}
              <FaArrowRight />
            </Link>
            <Link to={copy.secondary.to} className="btn btn-secondary">
              {copy.secondary.label}
            </Link>
          </div>
        </div>

        <aside className="dash-profile-card">
          <div className="dash-profile-top">
            <span className="dash-avatar">{getInitials(user?.username)}</span>
            <div>
              <strong>{user?.username}</strong>
              <span>{ROLE_LABEL[role]}</span>
            </div>
          </div>
          <dl>
            <div>
              <dt>Email</dt>
              <dd>{user?.email}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>
                {new Date().toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </dd>
            </div>
          </dl>
          <button type="button" className="dash-profile-link" onClick={() => setRefreshKey((key) => key + 1)}>
            Refresh overview
          </button>
        </aside>
      </section>

      {error && (
        <div className="dash-alert" role="alert">
          <strong>We could not refresh your numbers.</strong>
          <span>{error}</span>
        </div>
      )}

      <section className="dash-stats" aria-label="Key metrics">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div className="stat-card skeleton" key={index} style={{ minHeight: 128 }} />
            ))
          : statCards.map((card) => {
              const Icon = card.icon;
              return (
                <article className={`stat-card tone-${card.tone}`} key={card.label}>
                  <div className="stat-card-top">
                    <span className="stat-icon">
                      <Icon />
                    </span>
                    <span className="stat-label">{card.label}</span>
                  </div>
                  <strong className="stat-value">{formatStat(card.value, card.format)}</strong>
                  <span className="stat-hint">{card.hint}</span>
                </article>
              );
            })}
      </section>

      <div className="dash-columns">
        <section className="dash-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Shortcuts</span>
              <h2>Jump back in</h2>
            </div>
          </div>
          <div className="quick-actions">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link to={action.to} className="quick-action" key={action.label}>
                  <span className="quick-icon">
                    <Icon />
                  </span>
                  <span className="quick-copy">
                    <strong>{action.label}</strong>
                    <small>{action.description}</small>
                  </span>
                  <FaArrowRight className="quick-arrow" />
                </Link>
              );
            })}
          </div>
        </section>

        <section className="dash-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Latest</span>
              <h2>{role === 'student' ? 'Assignments to finish' : role === 'instructor' ? 'Recent submissions' : 'Newest accounts'}</h2>
            </div>
          </div>

          {statsLoading ? (
            <div className="recent-list">
              {Array.from({ length: 3 }).map((_, index) => (
                <div className="recent-item skeleton" key={index} style={{ minHeight: 64 }} />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="empty-state">
              <strong>Nothing waiting here.</strong>
              <span>
                {role === 'student'
                  ? 'New assignments will appear as your instructors publish them.'
                  : role === 'instructor'
                    ? 'Submissions from your learners will show up here.'
                    : 'New accounts will appear here as people join.'}
              </span>
            </div>
          ) : (
            <div className="recent-list">
              {recent.map((item) => (
                <Link to={item.href} className="recent-item" key={`${item.id}-${item.title}`}>
                  <span className="recent-marker" />
                  <span className="recent-copy">
                    <strong>{item.title}</strong>
                    <small>{item.subtitle}</small>
                  </span>
                  <span className="recent-meta">{item.meta}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Dashboard;
