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

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ message: 'Invalid amount' });
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

    await client.query(`
      INSERT INTO notifications (user_id, type, message, created_at)
      VALUES ($1, 'purchase', $2, CURRENT_TIMESTAMP)
    `, [instructor_id, `${studentName} has purchased your course "${courseTitle}"`]);

    await client.query('COMMIT');

    // === NOTIFICATION PART (real-time) ===
    const io = req.app.get('io');
    const onlineUsers = req.app.get('onlineUsers');
    const instructorSocketId = onlineUsers[instructor_id];
    if (instructorSocketId) {
      io.to(instructorSocketId).emit('new-notification', {
        message: `${studentName} has purchased your course "${courseTitle}"`,
        type: 'purchase',
        time: new Date()
      });
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
    const materialsRes = await pool.query(
      'SELECT id, title, content, link FROM materials WHERE course_id = $1 ORDER BY created_at',
      [id]
    );
    const assignmentsRes = await pool.query(
      'SELECT id, title, description, due_date, created_at, updated_at FROM assignments WHERE course_id = $1 ORDER BY created_at',
      [id]
    );

    res.json({
      ...courseRes.rows[0],
      materials: materialsRes.rows,
      assignments: assignmentsRes.rows,
    });
  } catch (err) {
    console.error('Student fetch course detail error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


// Submit assignment
exports.submitAssignment = async (req, res) => {
  const studentId = req.user.id;
  const { courseId, assignmentId } = req.params;
  const { content } = req.body;
  const files = req.files;

  try {
    if (!content && (!files || files.length === 0)) {
      return res.status(400).json({ message: 'Text or file is required' });
    }

    const assignmentCheck = await pool.query(
      'SELECT id FROM assignments WHERE id = $1 AND course_id = $2',
      [assignmentId, courseId]
    );
    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Assignment not found in this course' });
    }

    const enrollment = await pool.query(
      'SELECT 1 FROM enrollments WHERE student_id = $1 AND course_id = $2',
      [studentId, courseId]
    );
    if (enrollment.rows.length === 0) {
      return res.status(403).json({ message: 'You are not enrolled in this course' });
    }

    // Insert submission
    const submissionRes = await pool.query(
      `INSERT INTO submissions (student_id, assignment_id, content, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING id`,
      [studentId, assignmentId, content ?? null]
    );

    const submissionId = submissionRes.rows[0].id;

    // Insert files if any
    if (files && files.length > 0) {
      for (let file of files) {
        const filePath = `/uploads/submissions/${file.filename}`;
        await pool.query(
          `INSERT INTO submission_files (submission_id, file_path, file_name)
           VALUES ($1, $2, $3)`,
          [submissionId, filePath, file.originalname]
        );
      }
    }

    // Get instructorId, studentName, and assignmentTitle for notification
    const meta = await pool.query(`
      SELECT i.id AS instructor_id, u.username AS student_name, a.title AS assignment_title
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      JOIN users i ON c.instructor_id = i.id
      JOIN users u ON u.id = $1
      WHERE a.id = $2
    `, [studentId, assignmentId]);

    if (meta.rows.length > 0) {
      const { instructor_id, student_name, assignment_title } = meta.rows[0];
      const io = req.app.get('io');
      const onlineUsers = req.app.get('onlineUsers');

      // Save notification to DB
      await pool.query(`
        INSERT INTO notifications (user_id, type, message, created_at)
        VALUES ($1, 'assignment', $2, CURRENT_TIMESTAMP)
      `, [instructor_id, `${student_name} has submitted assignment "${assignment_title}"`]);

      // Send realtime if online
      const instructorSocketId = onlineUsers[instructor_id];
      if (instructorSocketId) {
        io.to(instructorSocketId).emit('new-notification', {
          message: `${student_name} has submitted assignment "${assignment_title}"`,
          type: 'assignment',
          time: new Date()
        });
      }
    }

    res.status(201).json({ message: 'Submission uploaded' });

  } catch (err) {
    console.error('Submit assignment error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

