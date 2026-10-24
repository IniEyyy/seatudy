const path = require('path');
const fs = require('fs');
const pool = require('../db');

const uploadsRoot = path.resolve(__dirname, '..', 'uploads');

function resolveStoredPath(storedPath) {
  if (!storedPath) return null;
  const relative = storedPath.replace(/^\/?uploads[\\/]/, '');
  const resolved = path.resolve(uploadsRoot, relative);
  if (!resolved.startsWith(`${uploadsRoot}${path.sep}`)) return null;
  return resolved;
}

function sendFile(res, storedPath, downloadName) {
  const filePath = resolveStoredPath(storedPath);
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File not found' });
  }

  const safeName = String(downloadName || path.basename(filePath)).replace(/["\r\n]/g, '');
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
  return res.sendFile(filePath);
}

exports.downloadMaterial = async (req, res) => {
  const { materialId } = req.params;

  try {
    const result = await pool.query(
      `SELECT m.title, m.link, c.instructor_id
       FROM materials m
       JOIN courses c ON c.id = m.course_id
       WHERE m.id = $1`,
      [materialId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Material not found' });
    }

    const material = result.rows[0];
    let allowed = req.user.role === 'admin' || req.user.id === material.instructor_id;

    if (!allowed && req.user.role === 'student') {
      const enrolled = await pool.query(
        `SELECT 1 FROM enrollments e
         JOIN materials m ON m.course_id = e.course_id
         WHERE m.id = $1 AND e.student_id = $2`,
        [materialId, req.user.id]
      );
      allowed = enrolled.rows.length > 0;
    }

    if (!allowed) {
      return res.status(403).json({ message: 'You do not have access to this file' });
    }

    const ext = path.extname(material.link || '');
    return sendFile(res, material.link, `${material.title}${ext}`);
  } catch (err) {
    console.error('Material download error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.downloadSubmissionFile = async (req, res) => {
  const { fileId } = req.params;

  try {
    const result = await pool.query(
      `SELECT sf.file_path, sf.file_name, s.student_id, c.instructor_id
       FROM submission_files sf
       JOIN submissions s ON s.id = sf.submission_id
       JOIN assignments a ON a.id = s.assignment_id
       JOIN courses c ON c.id = a.course_id
       WHERE sf.id = $1`,
      [fileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }

    const file = result.rows[0];
    const allowed =
      req.user.role === 'admin' ||
      req.user.id === file.student_id ||
      req.user.id === file.instructor_id;

    if (!allowed) {
      return res.status(403).json({ message: 'You do not have access to this file' });
    }

    return sendFile(res, file.file_path, file.file_name);
  } catch (err) {
    console.error('Submission download error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
