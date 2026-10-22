import { useNavigate } from 'react-router-dom';
import './studentCourses.css';

function CourseCard({ course, userRole, hasPurchased, hasEnrolled, onBuy, onEnroll }) {
  const navigate = useNavigate();

  return (
    <div key={course.id} className="course-card available">
      <h3>{course.title}</h3>
      <p><strong>Description: </strong> {course.description}</p>
      <p><strong>Rating:</strong> {course.rating_avg ? `${Number(course.rating_avg).toFixed(1)}/5` : 'Not rated yet'}</p>
      {!hasPurchased && <p><strong>Price:</strong> ${course.price ?? 0}</p>}

      <p><strong>Enrolled:</strong> {course.student_count ?? 0}</p>

      <button onClick={() => navigate(`/dashboard/student/courses/${course.id}`)}>View Course Detail</button>

      {userRole === 'student' && !hasPurchased && (
        <button onClick={() => onBuy(course.id)}>Buy Course</button>
      )}
      {userRole=='' && (
        <button onClick={() => navigate('/login')}>Buy Course</button>
      )}
      {userRole === 'student' && hasPurchased && !hasEnrolled && (
        <button onClick={() => onEnroll(course.id)}>Enroll</button>
      )}
    </div>
  );
}

export default CourseCard;


