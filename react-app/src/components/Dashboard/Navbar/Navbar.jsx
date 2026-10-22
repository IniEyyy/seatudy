import React, { useEffect, useState, useRef, useContext } from 'react';
import { FaBell } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../contexts/AuthContext';
import { io } from 'socket.io-client';
import './navbar.css';

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!user) return;

    // Connect to Socket.IO server
    const socket = io('http://localhost:5000');

    // Register current user on socket server
    socket.emit('register', user.id);

    // Listen for new real-time notifications
    socket.on('new-notification', (notif) => {
      setNotifications((prev) => [notif, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    if (!user || !token) return;

    // Fetch notifications from backend
    fetch(`http://localhost:5000/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data)) {
          setNotifications(data);
        }
      })
      .catch(err => console.error('❌ Failed to fetch notifications:', err));
  }, [user, token]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="navbar">
      <h2>Seatudy {user ? user.role : 'Guest'}</h2>
      <div className="navbar-links">
        <Link to="/dashboard">Dashboard</Link>
        {user?.role === 'student' && (
          <>
            <Link to="/dashboard/student/courses">Courses</Link>
            <Link to="/student/topup">TopUp</Link>
          </>
        )}
        {user?.role === 'instructor' && (
          <>
            <Link to="/dashboard/instructor/courses">My Courses</Link>
            <Link to="/dashboard/instructor/submissions">Submissions</Link>
          </>
        )}
        {user?.role === 'admin' && (
          <>
            <Link to="/dashboard/courses">Courses</Link>
            <Link to="/dashboard/admin">Users</Link>
          </>
        )}
        {user ? (
          <Link to="/login" onClick={handleLogout}>Logout</Link>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </div>

      <div className="navbar-right">
        {user && (
          <div className="notification-container" ref={dropdownRef}>
            {/* Notification button */}
            <button
              className="notification-icon"
              onClick={() => setOpen(!open)}
            >
              <FaBell size={20} />
              {notifications.length > 0 && (
                <span className="notification-badge">{notifications.length}</span>
              )}
            </button>

            {/* Dropdown with animation */}
            {open && (
              <div className={`notification-dropdown ${open ? 'open' : 'close'}`}>
                <div className="notif-header">
                  <h4>Notifications</h4>
                  {notifications.length > 0 && (
                    <button
                      className="mark-read-btn"
                      onClick={() => {
                        fetch('http://localhost:5000/api/notifications/mark-all-read', {
                          method: 'PUT',
                          headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                          }
                        })
                          .then(res => res.json())
                          .then(() => {
                            setNotifications([]); // Clear notifications in state
                          })
                          .catch(err => console.error('Failed to mark all read:', err));
                      }}
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <p className="no-notifications">No new notifications</p>
                ) : (
                  <ul>
                    {notifications.map((n) => (
                      <li key={n.id}>{n.text || n.message}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
        <div className="user-info">
          <span className="username">👤{user?.username || 'Guest'}</span>
          <span className="balance">💰${(!user || user.balance === 0) ? 0 : user?.balance}</span>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
