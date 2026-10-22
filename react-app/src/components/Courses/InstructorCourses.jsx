import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './instructorCourses.css';
import EditCourseForm from './EditCourseForm';
import CreateCourseForm from './CreateCourseForm';

function InstructorCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  const fetchCourses = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch('http://localhost:5000/api/instructor/courses', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch courses');
      const data = await res.json();
      setCourses(data);
    } catch (err) {
      console.error('Fetch courses error:', err.message);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleEditClick = (course) => {
    setEditingCourse(course);
  };

  const handleCreateClick = () => {
    setCreatingCourse(true);
  };

  const handleDelete = async (courseId) => {
    const token = localStorage.getItem('token');
    const confirmDelete = window.confirm('Are you sure you want to delete this course?');
    if (!confirmDelete) return;

    try {
      const res = await fetch(`http://localhost:5000/api/instructor/courses/${courseId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete');

      alert('Course deleted successfully');
      fetchCourses();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="my-courses">
      <h2>My Courses</h2>

      <button className="create-course-btn" onClick={handleCreateClick}>Create New Course</button>

      {creatingCourse && (
        <CreateCourseForm
          onClose={() => setCreatingCourse(false)}
          onUpdate={fetchCourses}
        />
      )}

      {editingCourse && (
        <EditCourseForm
          course={editingCourse}
          onClose={() => setEditingCourse(null)}
          onUpdate={fetchCourses}
        />
      )}

      {courses.length === 0 ? (
        <p>You haven’t created any courses yet.</p>
      ) : (
        <div className="course-list">
          {courses.map((course) => (
            <div key={course.id} className="course-card">
              <h3>{course.title}</h3>
              <p>Description: {course.description}</p>
              <p>Category: {course.category}</p>
              <p>Level: {course.level}</p>
              <p>Price: ${course.price}</p>
              <p>Rating: {course.rating_avg ?? 'Not rated yet'}</p>
              <p>Enrolled Students: {course.student_count ?? 0}</p>
              <p>Created: {new Date(course.created_at).toLocaleDateString()}</p>
              {course.updated_at && (
                <p>Last Updated: {new Date(course.updated_at).toLocaleString()}</p>
              )}

              <div className="button-group">
                <button onClick={() => navigate(`/dashboard/instructor/courses/${course.id}`)}>
                  View Course Detail
                </button>
                <button onClick={() => handleEditClick(course)}>Edit</button>
                <button onClick={() => handleDelete(course.id)} className="delete-btn">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default InstructorCourses;
