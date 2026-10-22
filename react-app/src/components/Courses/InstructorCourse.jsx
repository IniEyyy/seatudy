import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import './instructorCourse.css';
import AddMaterialForm from './AddMaterialForm';
import AddAssignmentForm from './AddAssignmentForm';
import EditAssignmentForm from './EditAssignmentForm.jsx';

function ViewCourseDetail() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingAssignment, setEditingAssignment] = useState(null);

  const token = localStorage.getItem('token');

  const handleDeleteMaterial = async (materialId) => {
    const confirm = window.confirm("Are you sure you want to delete this material?");
    
    if (!confirm) return;

    try {
      const res = await fetch(`http://localhost:5000/api/instructor/courses/${id}/materials/${materialId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      alert('Material deleted');
      fetchDetail();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/instructor/courses/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      setCourse(data.course || data);
      setMaterials(data.materials || data.course?.materials || []);
      setAssignments(data.assignments || data.course?.assignments || []);
    } catch (err) {
      console.error('Failed to fetch course detail:', err);
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  const handleDeleteAssignment = async (assignmentId) => {
    const confirm = window.confirm('Delete this assignment?');
    if (!confirm) return;

    try {
      const res = await fetch(`http://localhost:5000/api/instructor/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      alert('Assignment deleted!');
      fetchDetail();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) return <p>Loading...</p>;
  if (!course) return <p>Course not found.</p>;

  return (
    <div className="course-detail-container">
      <h2>{course.title}</h2>
      <p>{course.description}</p>
      <p>Category: {course.category}</p>
      <p>Level: {course.level}</p>
      <p>Price: ${course.price}</p>

      <section className="material-section">
        <h3>Materials</h3>
        {materials.length === 0 ? (
          <p className="no-material">No materials yet.</p>
        ) : (
          <ul className="material-list">
            {materials.map(mat => (
              <li key={mat.id} className="material-item">
                <div className="material-info">
                  <a
                    href={`http://localhost:5000${mat.link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="material-title"
                  >
                    {mat.title}
                  </a>
                  {mat.content && <p className="material-desc">{mat.content}</p>}
                </div>
                <button className="material-delete-btn" onClick={() => handleDeleteMaterial(mat.id, mat.link)}>🗑️</button>
              </li>
            ))}
          </ul>
        )}

        <AddMaterialForm courseId={id} onAdd={fetchDetail} />
      </section>

      <section className="assignment-section">
        <h3>Assignments</h3>

        {assignments.length === 0 ? (
          <p>No assignments yet.</p>
        ) : (
          <ul className="assignment-list">
            {assignments.map((asg) => (
              <li key={asg.id} className="assignment-item">
                <div className="assignment-info">
                  <strong>{asg.title}</strong>
                  <p>{asg.description}</p>
                  <small>Due: {new Date(asg.due_date).toLocaleDateString()}</small>
                </div>
                <div className="assignment-actions">
                  <button className="edit-btn" onClick={() => setEditingAssignment(asg)}>Edit</button>
                  <button className="remove-btn" onClick={() => handleDeleteAssignment(asg.id)}>Delete</button>
                  <Link to={`/dashboard/instructor/assignments/${asg.id}/submissions`}>
                    <button className="view-submissions-btn">View Submissions</button>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
        {editingAssignment ? (
          <EditAssignmentForm
            assignment={editingAssignment}
            onClose={() => setEditingAssignment(null)}
            onUpdate={fetchDetail}
          />):(
          <AddAssignmentForm courseId={id} onAdd={fetchDetail} />)
        }
      </section>
    </div>
  );
}

export default ViewCourseDetail;
