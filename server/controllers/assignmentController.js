const pool = require('../db');

// List every assignment from the courses the student is enrolled in
exports.getMyAssignments = async (req, res) => {
  const studentId = req.user.id;

  try {
    const result = await pool.query(`
      SELECT
        a.id,
        a.title,
        a.description,
        a.due_date,
        c.id AS course_id,
        c.title AS course_title,
        s.id AS submission_id,
        s.score,
        s.feedback,
        s.graded_at,
        s.created_at AS submitted_at,
        s.updated_at
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      JOIN enrollments e ON e.course_id = c.id AND e.student_id = $1
      LEFT JOIN LATERAL (
        SELECT id, score, feedback, graded_at, created_at, updated_at
        FROM submissions
        WHERE assignment_id = a.id AND student_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      ) s ON TRUE
      ORDER BY a.due_date ASC
    `, [studentId]);

    const assignments = result.rows.map((row) => {
      const isLate = row.submitted_at
        ? new Date(row.submitted_at) > new Date(row.due_date)
        : false;

      let status = 'Not Submitted';
      if (row.submitted_at) status = isLate ? 'Late' : 'On Time';

      return { ...row, status, is_late: isLate };
    });

    res.json(assignments);
  } catch (err) {
    console.error('Fetch student assignments error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
