import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './studentCourses.css';
import CourseCard from './CourseCard.jsx';

function StudentCourses() {
  const navigate = useNavigate();
  const [user, setUser] = useState({ username: '', role: '', balance: 0 });
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [boughtCourses, setBoughtCourses] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const token = localStorage.getItem('token');

  const [categoryFilter, setCategoryFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [sortByPopularity, setSortByPopularity] = useState('');
  const [sortByPrice, setSortByPrice] = useState('');

  let filteredCourses = availableCourses
    .filter(course => {
      return (
        (categoryFilter === '' || course.category === categoryFilter) &&
        (levelFilter === '' || course.level === levelFilter) &&
        (ratingFilter === 0 || (course.rating_avg ?? 0) >= ratingFilter)
      );
    });


  if (sortByPrice === 'asc') {
    filteredCourses.sort((a, b) => a.price - b.price);
  } else if (sortByPrice === 'desc') {
    filteredCourses.sort((a, b) => b.price - a.price);
  }
  if (sortByPopularity === 'asc') {
    filteredCourses.sort((a, b) => a.student_count - b.student_count);
  } else if (sortByPopularity === 'desc') {
    filteredCourses.sort((a, b) => b.student_count - a.student_count);
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (token) {
          const profileRes = await fetch('http://localhost:5000/api/profile', {
            headers: { Authorization: `Bearer ${token}` },
          });
          const userData = await profileRes.json();
          setUser(userData);

          if (userData.role !== 'student') {
            const publicRes = await fetch('http://localhost:5000/api/public/courses');
            const publicData = publicRes.ok ? await publicRes.json() : [];
            setAvailableCourses(publicData);
            return;
          }

          const res = await fetch('http://localhost:5000/api/student/courses', {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.status === 403) {
            navigate('/dashboard');
            return;
          }

          const data = await res.json();
          setEnrolledCourses(data.enrolled || []);
          setBoughtCourses(data.bought || []);
          setAvailableCourses(data.available || []);
        } else {
          const res = await fetch('http://localhost:5000/api/public/courses');
          const publicData = await res.json();
          setAvailableCourses(publicData);
        }
      } catch (err) {
        console.error('Failed to load courses:', err);
      }
    };

    fetchData();
  }, [token, navigate]);

  const handleBuy = async (courseId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/student/buy/${courseId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      alert(data.message);
      window.location.reload();
    } catch {
      alert('Purchase failed');
    }
  };

  const handleEnroll = async (courseId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/student/enroll/${courseId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      alert(data.message);
      window.location.reload();
    } catch {
      alert('Enrollment failed');
    }
  };

  return (
    <div className="student-courses">
      {user.role === 'student' && (
        <>
          <section className="course-section">
            <h2>Enrolled Courses</h2>
            <div className="course-grid">
              {enrolledCourses.map(course => (
                <CourseCard
                  key={course.id}
                  course={course}
                  userRole={user.role}
                  hasPurchased={true}
                  hasEnrolled={true}
                  onBuy={handleBuy}
                  onEnroll={handleEnroll}
                />
              ))}
            </div>
          </section>

          <section className="course-section">
            <h2>Bought Courses (Not Enrolled)</h2>
            <div className="course-grid">
              {boughtCourses.map(course => (
                <CourseCard
                  key={course.id}
                  course={course}
                  userRole={user.role}
                  hasPurchased={true}
                  hasEnrolled={false}
                  onBuy={handleBuy}
                  onEnroll={handleEnroll}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <section className="course-section">
        <h2>{user.role && user.role !== 'student' ? 'Browse Courses' : 'Available Courses'}</h2>
        <div className="filters">
          <select onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {[...new Set(availableCourses.map(c => c.category).filter(Boolean))]
              .sort()
              .map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
          </select>

          <select onChange={(e) => setLevelFilter(e.target.value)}>
            <option value="">All Levels</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>

          <select onChange={(e) => setRatingFilter(Number(e.target.value))}>
            <option value={0}>All Ratings</option>
            <option value={4}>4 stars & up</option>
            <option value={3}>3 stars & up</option>
            <option value={2}>2 stars & up</option>
          </select>

          <select onChange={(e) => setSortByPopularity(e.target.value)}>
            <option value="desc">Most Popular</option>
            <option value="asc">Least Popular</option>
          </select>

          <select onChange={e => setSortByPrice(e.target.value)}>
            <option value="asc">Price: Low to High</option>
            <option value="desc">Price: High to Low</option>
          </select>
        </div>

        <div className="course-grid">
          {filteredCourses.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              userRole={user.role}
              hasPurchased={false}
              hasEnrolled={false}
              onBuy={handleBuy}
              onEnroll={handleEnroll}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default StudentCourses;
