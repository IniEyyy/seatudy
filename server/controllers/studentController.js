const fs = require('fs');
const path = require('path');
const pool = require('../db');

// Get all student courses grouped by enrolled, bought, available
exports.getAllStudentCourses = async (req, res) => {
  const studentId = req.user.id;
  try {
    const enrolled = await pool.query(`
      SELECT c.* FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.student_id = $1
    `, [studentId]);

    const bought = await pool.query(`
      SELECT c.* FROM purchases p
      JOIN courses c ON p.course_id = c.id
      WHERE p.user_id = $1
      AND p.course_id NOT IN (
        SELECT course_id FROM enrollments WHERE student_id = $1
      )
    `, [studentId]);

    const available = await pool.query(`
      SELECT * FROM courses
      WHERE id NOT IN (
        SELECT course_id FROM purchases WHERE user_id = $1
      )
      AND id NOT IN (
        SELECT course_id FROM enrollments WHERE student_id = $1
      )
    `, [studentId]);

    res.json({
      enrolled: enrolled.rows,
      bought: bought.rows,
      available: available.rows
    });
  } catch (err) {
    console.error('Fetch student courses error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.topUpBalance = async (req, res) => {
  const { amount } = req.body;
  const userId = req.user.id;
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 10000) {
    return res.status(400).json({ message: 'Amount must be between 0.01 and 10,000' });
  }

  try {
    await pool.query(
      `UPDATE users SET balance = balance + $1 WHERE id = $2`,
      [numericAmount, userId]
    );

    const updated = await pool.query(`SELECT balance FROM users WHERE id = $1`, [userId]);
    res.json({ message: 'Balance updated', balance: updated.rows[0].balance });
  } catch (err) {
    console.error('Topup error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.enrollCourse = async (req, res) => {
  const studentId = req.user.id;
  const { courseId } = req.params;

  try {
    const courseRes = await pool.query('SELECT price FROM courses WHERE id = $1', [courseId]);
    if (courseRes.rows.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (Number(courseRes.rows[0].price) > 0) {
      const purchaseRes = await pool.query(
        'SELECT 1 FROM purchases WHERE user_id = $1 AND course_id = $2',
        [studentId, courseId]
      );
      if (purchaseRes.rows.length === 0) {
        return res.status(403).json({ message: 'Purchase the course before enrolling' });
      }
    }

    await pool.query(
      'INSERT INTO enrollments (student_id, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [studentId, courseId]
    );

    await pool.query(`
      UPDATE courses SET student_count = (
        SELECT COUNT(*) FROM enrollments WHERE course_id = $1
      ) WHERE id = $1
    `, [courseId]);

    res.json({ message: 'Enrolled successfully' });
  } catch (err) {
    console.error('Enrollment error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Check whether the logged-in student has purchased a course
exports.getPurchaseStatus = async (req, res) => {
  const userId = req.user.id;
  const { courseId } = req.params;

  try {
    const result = await pool.query(
      'SELECT 1 FROM purchases WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );
    res.json({ purchased: result.rows.length > 0 });
  } catch (err) {
    console.error('Purchase status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.buyCourse = async (req, res) => {
  const studentId = req.user.id;
  const { courseId } = req.params;
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // Lock the student row so two concurrent purchases cannot overspend
    const userRes = await client.query(
      'SELECT balance, username FROM users WHERE id = $1 FOR UPDATE',
      [studentId]
    );
    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'User not found' });
    }
    const { balance: userBalance, username: studentName } = userRes.rows[0];

    const existing = await client.query(
      'SELECT 1 FROM purchases WHERE user_id = $1 AND course_id = $2',
      [studentId, courseId]
    );
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'You already own this course' });
    }

    const courseRes = await client.query(
      'SELECT price, title, instructor_id FROM courses WHERE id = $1',
      [courseId]
    );
    if (courseRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Course not found' });
    }

    const { price: coursePrice, title: courseTitle, instructor_id } = courseRes.rows[0];

    if (Number(userBalance) < Number(coursePrice)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    await client.query(
      'UPDATE users SET balance = balance - $1 WHERE id = $2',
      [coursePrice, studentId]
    );
    await client.query(
      'INSERT INTO purchases (user_id, course_id) VALUES ($1, $2)',
      [studentId, courseId]
    );

    const notificationRes = await client.query(`
      INSERT INTO notifications (user_id, type, message, created_at)
      VALUES ($1, 'purchase', $2, CURRENT_TIMESTAMP)
      RETURNING id, type, message, is_read, created_at
    `, [instructor_id, `${studentName} has purchased your course "${courseTitle}"`]);

    await client.query('COMMIT');

    // === NOTIFICATION PART (real-time) ===
    const io = req.app.get('io');
    const onlineUsers = req.app.get('onlineUsers');
    const instructorSocketId = onlineUsers[instructor_id];
    if (instructorSocketId) {
      io.to(instructorSocketId).emit('new-notification', notificationRes.rows[0]);
    }

    res.json({ message: 'Course purchased successfully' });

  } catch (err) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    console.error('Buy course error:', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    if (client) client.release();
  }
};


// GET full course detail (with materials & assignments) for enrolled student
exports.getCourseDetail = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // Pastikan student sudah enroll
    const enrollmentCheck = await pool.query(
      'SELECT * FROM enrollments WHERE course_id = $1 AND student_id = $2',
      [id, userId]
    );

    if (enrollmentCheck.rows.length === 0) {
      return res.status(403).json({ message: 'You are not enrolled in this course' });
    }

    const courseRes = await pool.query('SELECT * FROM courses WHERE id = $1', [id]);
    if (courseRes.rows.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const materialsRes = await pool.query(
      'SELECT id, title, content, link FROM materials WHERE course_id = $1 ORDER BY created_at',
      [id]
    );
    const assignmentsRes = await pool.query(
      `SELECT a.id, a.title, a.description, a.due_date, a.created_at, a.updated_at,
              s.id AS submission_id, s.content AS submission_content, s.score,
              s.feedback, s.created_at AS submitted_at, s.updated_at AS submission_updated_at
       FROM assignments a
       LEFT JOIN LATERAL (
         SELECT id, content, score, feedback, created_at, updated_at
         FROM submissions
         WHERE assignment_id = a.id AND student_id = $2
         LIMIT 1
       ) s ON TRUE
       WHERE a.course_id = $1
       ORDER BY a.created_at`,
      [id, userId]
    );

    const submissionIds = assignmentsRes.rows
      .map((assignment) => assignment.submission_id)
      .filter(Boolean);
    const filesRes = submissionIds.length
      ? await pool.query(
          `SELECT id, submission_id, file_name
           FROM submission_files
           WHERE submission_id = ANY($1::int[])
           ORDER BY id`,
          [submissionIds]
        )
      : { rows: [] };

    const filesBySubmission = {};
    for (const file of filesRes.rows) {
      filesBySubmission[file.submission_id] ||= [];
      filesBySubmission[file.submission_id].push(file);
    }

    const assignments = assignmentsRes.rows.map((assignment) => ({
      ...assignment,
      files: assignment.submission_id ? filesBySubmission[assignment.submission_id] || [] : [],
    }));

    const totalAssignments = assignments.length;
    const submittedAssignments = assignments.filter((assignment) => assignment.submission_id).length;
    const graded = assignments.filter((assignment) => assignment.score != null);
    const averageScore = graded.length
      ? Number((graded.reduce((sum, assignment) => sum + Number(assignment.score), 0) / graded.length).toFixed(1))
      : null;

    res.json({
      ...courseRes.rows[0],
      materials: materialsRes.rows,
      assignments,
      progress: {
        totalAssignments,
        submittedAssignments,
        gradedAssignments: graded.length,
        percent: totalAssignments
          ? Math.round((submittedAssignments / totalAssignments) * 100)
          : 0,
        averageScore,
        certificateEligible:
          totalAssignments > 0 &&
          submittedAssignments === totalAssignments &&
          graded.length === totalAssignments &&
          averageScore >= 60,
      },
    });
  } catch (err) {
    console.error('Student fetch course detail error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


// Submit or resubmit an assignment.
exports.submitAssignment = async (req, res) => {
  const studentId = req.user.id;
  const { courseId, assignmentId } = req.params;
  const { content } = req.body;
  const files = req.files || [];
  let client;

  const cleanupUploads = () => {
    for (const file of files) {
      fs.promises
        .unlink(path.join(__dirname, '..', 'uploads', 'submissions', file.filename))
        .catch(() => {});
    }
  };

  try {
    if (!content?.trim() && files.length === 0) {
      return res.status(400).json({ message: 'Text or file is required' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const assignmentCheck = await client.query(
      'SELECT id FROM assignments WHERE id = $1 AND course_id = $2',
      [assignmentId, courseId]
    );
    if (assignmentCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      cleanupUploads();
      return res.status(404).json({ message: 'Assignment not found in this course' });
    }

    const enrollment = await client.query(
      'SELECT 1 FROM enrollments WHERE student_id = $1 AND course_id = $2',
      [studentId, courseId]
    );
    if (enrollment.rows.length === 0) {
      await client.query('ROLLBACK');
      cleanupUploads();
      return res.status(403).json({ message: 'You are not enrolled in this course' });
    }

    const submissionRes = await client.query(
      `INSERT INTO submissions (student_id, assignment_id, content, created_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (student_id, assignment_id) DO UPDATE
       SET content = EXCLUDED.content,
           score = NULL,
           feedback = NULL,
           graded_at = NULL,
           graded_by = NULL,
           updated_at = CURRENT_TIMESTAMP
       RETURNING id, (xmax = 0) AS inserted`,
      [studentId, assignmentId, content?.trim() || null]
    );

    const submissionId = submissionRes.rows[0].id;
    const wasInserted = submissionRes.rows[0].inserted;

    const oldFiles = await client.query(
      'SELECT file_path FROM submission_files WHERE submission_id = $1',
      [submissionId]
    );
    await client.query('DELETE FROM submission_files WHERE submission_id = $1', [submissionId]);

    for (const file of files) {
      const filePath = `/uploads/submissions/${file.filename}`;
      await client.query(
        `INSERT INTO submission_files (submission_id, file_path, file_name)
         VALUES ($1, $2, $3)`,
        [submissionId, filePath, file.originalname]
      );
    }

    const meta = await client.query(
      `SELECT i.id AS instructor_id, u.username AS student_name, a.title AS assignment_title
       FROM assignments a
       JOIN courses c ON a.course_id = c.id
       JOIN users i ON c.instructor_id = i.id
       JOIN users u ON u.id = $1
       WHERE a.id = $2`,
      [studentId, assignmentId]
    );

    let notification = null;
    if (meta.rows.length > 0) {
      const { instructor_id, student_name, assignment_title } = meta.rows[0];
      const verb = wasInserted ? 'submitted' : 'resubmitted';
      notification = {
        instructorId: instructor_id,
        type: 'assignment',
        message: `${student_name} has ${verb} assignment "${assignment_title}"`,
      };

      const notificationRes = await client.query(
        `INSERT INTO notifications (user_id, type, message, created_at)
         VALUES ($1, 'assignment', $2, CURRENT_TIMESTAMP)
         RETURNING id, type, message, is_read, created_at`,
        [notification.instructorId, notification.message]
      );
      notification.row = notificationRes.rows[0];
    }

    await client.query('COMMIT');

    for (const old of oldFiles.rows) {
      if (!old.file_path) continue;
      const relative = old.file_path.replace(/^\/?uploads[\\/]/, '');
      fs.promises
        .unlink(path.join(__dirname, '..', 'uploads', relative))
        .catch(() => {});
    }

    if (notification) {
      const io = req.app.get('io');
      const onlineUsers = req.app.get('onlineUsers');
      const instructorSocketId = onlineUsers?.[notification.instructorId];
      if (instructorSocketId && notification.row) {
        io.to(instructorSocketId).emit('new-notification', notification.row);
      }
    }

    return res.status(wasInserted ? 201 : 200).json({
      message: wasInserted ? 'Submission uploaded' : 'Submission updated',
      resubmitted: !wasInserted,
    });
  } catch (err) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    cleanupUploads();
    console.error('Submit assignment error:', err);
    return res.status(500).json({ message: 'Server error' });
  } finally {
    if (client) client.release();
  }
};