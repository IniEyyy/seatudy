import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './studentCourse.css';
import ReviewList from './Review/ReviewList.jsx';
import ReviewForm from './Review/ReviewForm.jsx';
import ForumDiscussion from './Discussion/ForumDiscussion.jsx';
import AssignmentSubmitForm from '../Assignment/AssignmentSubmitForm.jsx'

function StudentCourse() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [user, setUser] = useState(null);
  const [course, setCourse] = useState(null);
  const [hasEnrolled, setHasEnrolled] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshReview, setRefreshReview] = useState(false);
  const handleReviewRefresh = () => setRefreshReview(prev => !prev);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const isTokenExpired = (token) => {
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      return decoded.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  };

  useEffect(() => {
    const fetchCourseDetail = async () => {
      if (token && isTokenExpired(token)) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      try {
        if (token) {
          const profileRes = await fetch('http://localhost:5000/api/profile', {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (profileRes.ok) {
            const userData = await profileRes.json();
            setUser(userData);
          }
        }

        let studentRes;
        if (token) {
          studentRes = await fetch(`http://localhost:5000/api/student/courses/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (studentRes.ok) {
            const fullCourse = await studentRes.json();
            setCourse(fullCourse);
            setHasEnrolled(true);
            setHasPurchased(true);
            return;
          }
        }

        const publicRes = await fetch(`http://localhost:5000/api/public/courses/${id}`);
        if (publicRes.ok) {
          const publicCourse = await publicRes.json();
          setCourse(publicCourse);
        } else {
          navigate('/login');
          return;
        }

        if (token) {
          const purchaseRes = await fetch(`http://localhost:5000/api/student/purchases/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (purchaseRes.ok) {
            const purchaseData = await purchaseRes.json();
            setHasPurchased(purchaseData.purchased);
          }
        }

      } catch (err) {
        console.error('Fetch course error:', err);
        setError('Failed to load course');
      }
    };

    fetchCourseDetail();
  }, [id, navigate, token]);

  const handleBuy = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/student/buy/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      alert(data.message);
      window.location.reload();
    } catch {
      alert('Failed to purchase course');
    }
  };

  const handleEnroll = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/student/enroll/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      alert(data.message);
      window.location.reload();
    } catch {
      alert('Failed to enroll in course');
    }
  };

  if (error) return <p>{error}</p>;
  if (!course) return <p>Loading course...</p>;

  return (
    <>
      <h1>| Viewing as {user?.role ?? 'Guest'}</h1>
      <div className="course-card">
        <h2>{course.title}</h2>
        <p>{course.description}</p>
        <p><strong>Price:</strong> {Number(course.price) > 0 ? `$${course.price}` : 'Free'}</p>
        {course.category && <p><strong>Category:</strong> {course.category}</p>}
        {course.level && <p><strong>Level:</strong> {course.level}</p>}
        <p><strong>Rating:</strong> {course.rating_avg ? `${Number(course.rating_avg).toFixed(1)}/5` : 'Not rated yet'}</p>
        <p><strong>Students Enrolled:</strong> {course.student_count ?? 0}</p>
        <p><strong>Instructor:</strong> {course.instructor_name ?? 'N/A'}</p>

        {token && user?.role === 'student' && (
          (!hasPurchased && (
            <button onClick={handleBuy}>Buy Course</button>
          )) || (hasPurchased && !hasEnrolled && (
            <button onClick={handleEnroll}>Enroll</button>
          ))
        )}

        {(hasPurchased && hasEnrolled) && (
          <div>
            <div className="tab-buttons">
              <button onClick={() => handleTabChange('overview')}>Overview</button>
              <button onClick={() => handleTabChange('materials')}>Materials</button>
              <button onClick={() => handleTabChange('assignments')}>Assignments</button>
              <button onClick={() => handleTabChange('review')}>Review</button>
              <button onClick={() => handleTabChange('forum')}>Forum</button>
            </div>
            <div className="tab-content" key={activeTab}>
            {activeTab === 'overview' && (
              <div className='course-detail'>
                <h3>Syllabus</h3>
                <p>{course.syllabus}</p>
              </div>
            )}

            {activeTab === 'materials' && course.materials && (
              <div className="course-detail">
                <h3>Materials</h3>
                <div className="material-list-student">
                  {course.materials.map((m, i) => {
                    const fileUrl = `http://localhost:5000${m.link}`;
                    const ext = m.link?.split('.').pop().toLowerCase();
                    const isImage = ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
                    const isVideo = ['mp4', 'mov', 'avi'].includes(ext);
                    const isPDF = ext === 'pdf';
                    const isDoc = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext);

                    return (
                      <div key={i} className="material-card">
                        <div className="material-title">
                          <strong>{m.title}</strong>
                          <a
                            href={fileUrl}
                            download
                            onClick={(e) => e.stopPropagation()}
                            className="download-button"
                          >
                            ⬇️
                          </a>
                        </div>

                        {m.content && <p className="material-description">{m.content}</p>}

                        <div className="material-preview">
                          {isVideo && (
                            <video controls src={fileUrl} width="100%" />
                          )}

                          {isPDF && (
                            <iframe
                              src={fileUrl}
                              title={m.title}
                              width="100%"
                              height="400"
                              frameBorder="0"
                            />
                          )}

                          {isImage && (
                            <img src={fileUrl} alt={m.title} style={{ maxWidth: '100%', borderRadius: 4 }} />
                          )}

                          {isDoc && (
                            <iframe
                              src={`https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`}
                              title={m.title}
                              width="100%"
                              height="450"
                              frameBorder="0"
                            />
                          )}

                          {!isVideo && !isPDF && !isImage && !isDoc && (
                            <p><a href={fileUrl} target="_blank" rel="noreferrer">Open File</a></p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}


            {activeTab === 'assignments' && course.assignments && (
              <div className='course-detail'>
                <h3>Assignments</h3>
                <ul>
                  {course.assignments.map((a, i) => (
                    <li key={i}>
                      <h4>{a.title}</h4>
                      <p>{a.description}</p>
                      <p><strong>Due:</strong> {new Date(a.due_date).toLocaleDateString()}</p>

                      <AssignmentSubmitForm
                        token={token}
                        courseId={id}
                        assignmentId={a.id}
                        onSuccess={() => alert('Submitted!')}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {activeTab === 'review' && (
              <div className="course-detail">
                <h3>Write a Review</h3>
                {/* <ReviewForm courseId={course.id} />
                  <ReviewList courseId={course.id} /> */}
                <ReviewForm courseId={course.id} onSuccess={handleReviewRefresh} />
                <ReviewList courseId={course.id} refresh={refreshReview} />
              </div>
            )}

            {activeTab === 'forum' && (
              <div className="course-detail">
                <ForumDiscussion courseId={course.id} />
              </div>
            )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default StudentCourse;
