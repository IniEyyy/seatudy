// controllers/publicController.js
const pool = require('../db');

exports.getAllPublicCourses = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id, 
        c.title, 
        c.description, 
        c.category,
        c.level,
        c.rating_avg,
        c.student_count,
        c.price,
        u.username AS instructor_name
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      ORDER BY c.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching public courses:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getPublicCourseDetail = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        c.id,
        c.title, 
        c.description, 
        c.syllabus,
        c.category,
        c.level,
        c.price,
        c.rating_avg,
        c.student_count,
        c.created_at,
        u.username AS instructor_name
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      WHERE c.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching course detail:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
