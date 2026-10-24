const pool = require('../db');

const asNumber = (value) => Number(value) || 0;

async function getStudentDashboard(userId) {
  const [enrollments, assignments, scores, upcoming, profile, latestCourse] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS count FROM enrollments WHERE student_id = $1', [userId]),
    pool.query(
      `SELECT COUNT(*)::int AS pending
       FROM assignments a
       JOIN enrollments e ON e.course_id = a.course_id AND e.student_id = $1
       WHERE NOT EXISTS (
         SELECT 1 FROM submissions s
         WHERE s.assignment_id = a.id AND s.student_id = $1
       )`,
      [userId]
    ),
    pool.query(
      `SELECT COALESCE(ROUND(AVG(score), 1), 0)::float AS average,
              COUNT(*) FILTER (WHERE score IS NOT NULL)::int AS graded
       FROM submissions WHERE student_id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT a.id, a.title, a.due_date, c.id AS course_id, c.title AS course_title
       FROM assignments a
       JOIN enrollments e ON e.course_id = a.course_id AND e.student_id = $1
       JOIN courses c ON c.id = a.course_id
       WHERE NOT EXISTS (
         SELECT 1 FROM submissions s
         WHERE s.assignment_id = a.id AND s.student_id = $1
       )
       ORDER BY a.due_date ASC
       LIMIT 4`,
      [userId]
    ),
    pool.query('SELECT balance FROM users WHERE id = $1', [userId]),
    pool.query(
      `SELECT c.id, c.title
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.student_id = $1
       ORDER BY e.enrolled_at DESC
       LIMIT 1`,
      [userId]
    ),
  ]);

  return {
    stats: {
      enrolledCourses: asNumber(enrollments.rows[0]?.count),
      pendingAssignments: asNumber(assignments.rows[0]?.pending),
      averageScore: asNumber(scores.rows[0]?.average),
      gradedSubmissions: asNumber(scores.rows[0]?.graded),
      balance: asNumber(profile.rows[0]?.balance),
    },
    recent: upcoming.rows.map((row) => ({
      id: row.id,
      title: row.title,
      subtitle: row.course_title,
      meta: `Due ${new Date(row.due_date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })}`,
      href: `/dashboard/student/courses/${row.course_id}`,
    })),
    continueCourse: latestCourse.rows[0]
      ? {
          id: latestCourse.rows[0].id,
          title: latestCourse.rows[0].title,
          href: `/dashboard/student/courses/${latestCourse.rows[0].id}`,
        }
      : null,
  };
}

async function getInstructorDashboard(userId) {
  const [courses, students, pending, rating, recent] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS count FROM courses WHERE instructor_id = $1', [userId]),
    pool.query(
      `SELECT COUNT(DISTINCT e.student_id)::int AS count
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE c.instructor_id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS pending
       FROM submissions s
       JOIN assignments a ON a.id = s.assignment_id
       JOIN courses c ON c.id = a.course_id
       WHERE c.instructor_id = $1 AND s.score IS NULL`,
      [userId]
    ),
    pool.query(
      'SELECT COALESCE(ROUND(AVG(rating_avg), 2), 0)::float AS average FROM courses WHERE instructor_id = $1',
      [userId]
    ),
    pool.query(
      `SELECT s.id, s.created_at, s.score, u.username AS student,
              a.id AS assignment_id, a.title AS assignment, c.title AS course
       FROM submissions s
       JOIN assignments a ON a.id = s.assignment_id
       JOIN courses c ON c.id = a.course_id
       JOIN users u ON u.id = s.student_id
       WHERE c.instructor_id = $1
       ORDER BY s.created_at DESC
       LIMIT 4`,
      [userId]
    ),
  ]);

  return {
    stats: {
      courses: asNumber(courses.rows[0]?.count),
      students: asNumber(students.rows[0]?.count),
      pendingReviews: asNumber(pending.rows[0]?.pending),
      averageRating: asNumber(rating.rows[0]?.average),
    },
    recent: recent.rows.map((row) => ({
      id: row.id,
      title: `${row.student} submitted ${row.assignment}`,
      subtitle: row.course,
      meta: row.score === null ? 'Needs review' : `Scored ${Number(row.score).toFixed(0)}/100`,
      href: `/dashboard/instructor/assignments/${row.assignment_id}/submissions`,
    })),
  };
}

async function getAdminDashboard() {
  const [users, courses, enrollments, revenue, recent] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE role = 'student')::int AS students,
              COUNT(*) FILTER (WHERE role = 'instructor')::int AS instructors
       FROM users`
    ),
    pool.query('SELECT COUNT(*)::int AS count FROM courses'),
    pool.query('SELECT COUNT(*)::int AS count FROM enrollments'),
    pool.query(
      `SELECT COALESCE(SUM(c.price), 0)::float AS total
       FROM purchases p JOIN courses c ON c.id = p.course_id`
    ),
    pool.query(
      `SELECT id, username, role, created_at FROM users
       ORDER BY created_at DESC LIMIT 4`
    ),
  ]);

  return {
    stats: {
      users: asNumber(users.rows[0]?.total),
      students: asNumber(users.rows[0]?.students),
      instructors: asNumber(users.rows[0]?.instructors),
      courses: asNumber(courses.rows[0]?.count),
      enrollments: asNumber(enrollments.rows[0]?.count),
      revenue: asNumber(revenue.rows[0]?.total),
    },
    recent: recent.rows.map((row) => ({
      id: row.id,
      title: row.username,
      subtitle: row.role,
      meta: new Date(row.created_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      href: '/dashboard/admin',
    })),
  };
}

exports.getDashboardStats = async (req, res) => {
  try {
    const { id, role } = req.user;
    let payload;

    if (role === 'admin') payload = await getAdminDashboard();
    else if (role === 'instructor') payload = await getInstructorDashboard(id);
    else payload = await getStudentDashboard(id);

    res.json({ role, ...payload });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ message: 'Could not load dashboard stats' });
  }
};
