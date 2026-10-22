const pool = require('../db');
const path = require('path');
const fs = require('fs');

// GET all courses for instructor
exports.getAllCourses = async (req, res) => {
  try {
    if (req.user.role !== 'instructor') {
      return res.status(403).json({ message: 'Only instructors can access this route' });
    }

    const result = await pool.query(`
      SELECT 
        id, title, description, price, level, category, syllabus,
        rating_avg, student_count, created_at, updated_at
      FROM courses
      WHERE instructor_id = $1
      ORDER BY created_at DESC
    `, [req.user.id]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching instructor courses:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST create new course
exports.createCourse = async (req, res) => {
  const { title, description, category, price, level, syllabus } = req.body;

  if (req.user.role !== 'instructor') {
    return res.status(403).json({ message: 'Only instructors can create courses' });
  }

  if (!title || !description || !category || price === undefined || !level) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO courses 
       (title, description, category, price, level, instructor_id, syllabus)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title, description, category, price, level, req.user.id, syllabus]
    );

    res.status(201).json({ message: 'Course created', course: result.rows[0] });
  } catch (err) {
    console.error('Create course error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT update course
exports.updateCourse = async (req, res) => {
  const { id } = req.params;
  const { title, description, price, level, category, syllabus } = req.body;

  if (req.user.role !== 'instructor') {
    return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const courseCheck = await pool.query(
      'SELECT * FROM courses WHERE id = $1 AND instructor_id = $2',
      [id, req.user.id]
    );

    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Course not found or unauthorized' });
    }

    const result = await pool.query(`
      UPDATE courses
      SET title = $1,
          description = $2,
          price = $3,
          level = $4,
          category = $5,
          syllabus = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *`,
      [title, description, price, level, category, syllabus, id]
    );

    res.status(200).json({ message: 'Course updated successfully', course: result.rows[0] });
  } catch (err) {
    console.error('Update course error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE course
exports.deleteCourse = async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== 'instructor') {
    return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const check = await pool.query(
      'SELECT * FROM courses WHERE id = $1 AND instructor_id = $2',
      [id, req.user.id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Course not found or unauthorized' });
    }

    await pool.query('DELETE FROM courses WHERE id = $1', [id]);

    res.json({ message: 'Course deleted successfully' });
  } catch (err) {
    console.error('Delete course error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET single course detail for instructor
exports.getCourseDetail = async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== 'instructor') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const courseRes = await pool.query(
      'SELECT * FROM courses WHERE id = $1 AND instructor_id = $2',
      [id, req.user.id]
    );

    if (courseRes.rows.length === 0) {
      return res.status(404).json({ message: 'Course not found or unauthorized' });
    }

    const materials = await pool.query(
      'SELECT * FROM materials WHERE course_id = $1',
      [id]
    );

    const assignments = await pool.query(
      'SELECT * FROM assignments WHERE course_id = $1',
      [id]
    );

    res.json({
      course: courseRes.rows[0],
      materials: materials.rows,
      assignments: assignments.rows
    });
  } catch (err) {
    console.error('Course detail error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add Material to Course
exports.addMaterial = async (req, res) => {
  const { courseId } = req.params;
  const { content } = req.body;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  try {
    const courseCheck = await pool.query(
      'SELECT 1 FROM courses WHERE id = $1 AND instructor_id = $2',
      [courseId, req.user.id]
    );
    if (courseCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Unauthorized or course not found' });
    }

    for (let file of files) {
      const fileTitle = path.parse(file.originalname).name;
      const filePath = `/uploads/materials/${file.filename}`;

      await pool.query(
        `INSERT INTO materials (course_id, title, content, link, created_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [courseId, fileTitle, content||'', filePath]
      );
    }

    res.status(201).json({ message: 'Materials uploaded successfully' });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ message: 'Server error during file upload' });
  }
};

// Add Assignment to Course
exports.addAssignment = async (req, res) => {
  const instructorId = req.user.id;
  const { courseId } = req.params;
  const { title, description, due_date } = req.body;

  if (!title || !description || !due_date) {
    return res.status(400).json({ message: 'Title, description, and due date are required' });
  }

  try {
    const courseCheck = await pool.query(
      'SELECT * FROM courses WHERE id = $1 AND instructor_id = $2',
      [courseId, instructorId]
    );
    if (courseCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Unauthorized or course not found' });
    }

    const result = await pool.query(
      `INSERT INTO assignments (course_id, title, description, due_date)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [courseId, title, description, due_date]
    );

    res.status(201).json({ message: 'Assignment added', assignment: result.rows[0] });
  } catch (err) {
    console.error('Add assignment error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteMaterial = async (req, res) => {
  const { courseId, materialId } = req.params;

  try {
    const check = await pool.query(
      `SELECT m.*, c.instructor_id 
       FROM materials m 
       JOIN courses c ON m.course_id = c.id 
       WHERE m.id = $1 AND c.id = $2 AND c.instructor_id = $3`,
      [materialId, courseId, req.user.id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Material not found or unauthorized' });
    }

    const material = check.rows[0];
    const filePath = path.join(__dirname, '..', material.link);
    console.log('Deleting file from:', filePath);

    // Delete file from server
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    } else {
      console.warn('File does not exist:', filePath);
    }

    // Delete record from DB
    await pool.query(`DELETE FROM materials WHERE id = $1`, [materialId]);

    res.json({ message: 'Material deleted successfully' });
  } catch (err) {
    console.error('Delete material error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update Assignment
exports.updateAssignment = async (req, res) => {
  const instructorId = req.user.id;
  const { assignmentId } = req.params;
  const { title, description, due_date } = req.body;

  try {
    const check = await pool.query(`
      SELECT a.*, c.instructor_id FROM assignments a
      JOIN courses c ON a.course_id = c.id
      WHERE a.id = $1 AND c.instructor_id = $2
    `, [assignmentId, instructorId]);

    if (check.rows.length === 0) {
      return res.status(403).json({ message: 'Unauthorized or assignment not found' });
    }

    const updated = await pool.query(`
      UPDATE assignments
      SET title = $1, description = $2, due_date = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *`,
      [title, description, due_date, assignmentId]
    );

    res.status(200).json({ message: 'Assignment updated', assignment: updated.rows[0] });
  } catch (err) {
    console.error('Update assignment error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE Assignment
exports.deleteAssignment = async (req, res) => {
  const instructorId = req.user.id;
  const { assignmentId } = req.params;

  try {
    const check = await pool.query(`
      SELECT a.*, c.instructor_id FROM assignments a
      JOIN courses c ON a.course_id = c.id
      WHERE a.id = $1 AND c.instructor_id = $2
    `, [assignmentId, instructorId]);

    if (check.rows.length === 0) {
      return res.status(403).json({ message: 'Unauthorized or assignment not found' });
    }

    await pool.query('DELETE FROM assignments WHERE id = $1', [assignmentId]);
    res.status(200).json({ message: 'Assignment deleted' });
  } catch (err) {
    console.error('Delete assignment error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET submissions for a specific assignment
exports.getAssignmentSubmissions = async (req, res) => {
  const { assignmentId } = req.params;
  const instructorId = req.user.id;

  try {
    const assignmentRes = await pool.query(`
      SELECT a.*, c.instructor_id
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      WHERE a.id = $1 AND c.instructor_id = $2
    `, [assignmentId, instructorId]);

    if (assignmentRes.rows.length === 0) {
      return res.status(403).json({ message: 'Assignment not found or access denied' });
    }

    const assignment = assignmentRes.rows[0];

    // 2. Get all enrolled students
    const studentsRes = await pool.query(`
      SELECT u.id AS student_id, u.username AS student_name
      FROM users u
      JOIN enrollments e ON u.id = e.student_id
      WHERE e.course_id = $1
    `, [assignment.course_id]);

    const students = studentsRes.rows;

    // 3. Take last submission of student
    const submissionsRes = await pool.query(`
      SELECT DISTINCT ON (s.student_id) s.*, s.created_at AS submitted_at, u.username AS student_name
      FROM submissions s
      JOIN users u ON u.id = s.student_id
      WHERE s.assignment_id = $1
      ORDER BY s.student_id, s.created_at DESC
    `, [assignmentId]);


    const submissionsMap = {};
    submissionsRes.rows.forEach(sub => {
      submissionsMap[sub.student_id] = sub;
    });

    const result = students.map(student => {
      const sub = submissionsMap[student.student_id];
      let status = 'Not Submitted';
      let isLate = false;
      let submittedAt = null;

      if (sub) {
        submittedAt = sub.submitted_at;
        isLate = new Date(submittedAt) > new Date(assignment.due_date);
        status = isLate ? 'Late' : 'On Time';
      }

      return {
        student_id: student.student_id,
        student_name: student.student_name,
        submitted_at: submittedAt,
        status,
        is_late: isLate,
        content: sub?.content || '',
        score: sub?.score,
        submission_id: sub?.id || null
      };
    });

    const total = students.length;
    const submitted = result.filter(r => r.status === 'On Time').length;
    const late = result.filter(r => r.status === 'Late').length;
    const notYet = result.filter(r => r.status === 'Not Submitted').length;

    res.json({
      assignment: {
        id: assignment.id,
        title: assignment.title,
        due_date: assignment.due_date
      },
      submissions: result,
      stats: {
        total,
        submitted,
        late,
        notYet
      }
    });

  } catch (err) {
    console.error('Fetch assignment submissions error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET submission summary across all instructor assignments
exports.getSubmissionsOverview = async (req, res) => {
  const instructorId = req.user.id;

  try {
    const result = await pool.query(`
      SELECT
        a.id AS assignment_id,
        a.title,
        a.due_date,
        c.id AS course_id,
        c.title AS course_title,
        (SELECT COUNT(*)::int FROM enrollments e WHERE e.course_id = c.id) AS total_students,
        COALESCE(stats.submitted, 0)::int AS submitted,
        COALESCE(stats.on_time, 0)::int AS on_time,
        COALESCE(stats.late, 0)::int AS late
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) AS submitted,
          COUNT(*) FILTER (WHERE latest.created_at <= a.due_date) AS on_time,
          COUNT(*) FILTER (WHERE latest.created_at > a.due_date) AS late
        FROM (
          SELECT DISTINCT ON (s.student_id) s.student_id, s.created_at
          FROM submissions s
          WHERE s.assignment_id = a.id
          ORDER BY s.student_id, s.created_at DESC
        ) latest
      ) stats ON TRUE
      WHERE c.instructor_id = $1
      ORDER BY a.due_date DESC NULLS LAST, c.title, a.title
    `, [instructorId]);

    res.json(result.rows);
  } catch (err) {
    console.error('Fetch submissions overview error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.giveScore = async (req, res) => {
  const { submissionId } = req.params;
  const { score } = req.body;
  const instructorId = req.user.id;

  const numericScore = Number(score);
  if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 100) {
    return res.status(400).json({ message: 'Score must be between 0 and 100' });
  }

  try {
    const ownership = await pool.query(`
      SELECT s.id
      FROM submissions s
      JOIN assignments a ON s.assignment_id = a.id
      JOIN courses c ON a.course_id = c.id
      WHERE s.id = $1 AND c.instructor_id = $2
    `, [submissionId, instructorId]);

    if (ownership.rows.length === 0) {
      return res.status(404).json({ message: 'Submission not found or access denied' });
    }

    const update = await pool.query(
      'UPDATE submissions SET score = $1 WHERE id = $2 RETURNING *',
      [numericScore, submissionId]
    );

    res.json({ message: 'Score updated', submission: update.rows[0] });
  } catch (err) {
    console.error('Score update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
