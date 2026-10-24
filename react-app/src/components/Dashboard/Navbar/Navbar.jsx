import { useContext, useEffect, useRef, useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FaBell,
  FaBars,
  FaChevronDown,
  FaSignOutAlt,
  FaTimes,
  FaWallet,
} from 'react-icons/fa';
import { io } from 'socket.io-client';
import { AuthContext } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import ThemeToggle from '../../Common/ThemeToggle';
import './navbar.css';
import { apiFetch, API_URL } from '../../../lib/api';


const ROLE_LABEL = {
  student: 'Student',
  instructor: 'Instructor',
  admin: 'Administrator',
};

function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'S';
}

function timeAgo(value) {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

function Navbar() {
  const { user, token, logout } = useContext(AuthContext);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  useEffect(() => {
    setMobileOpen(false);
    setOpenNotifications(false);
    setOpenUserMenu(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!user || !token) return undefined;

    const socket = io(API_URL || window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socket.on('new-notification', (notif) => {
      setNotifications((prev) => [notif, ...prev]);
    });

    return () => socket.disconnect();
  }, [user, token]);

  useEffect(() => {
    if (!user || !token) return;

    apiFetch('/api/notifications', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setNotifications(data);
      })
      .catch(() => {});
  }, [user, token]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setOpenNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setOpenUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    showToast('You have been signed out.', 'info');
    navigate('/login');
  };

  const handleMarkAllRead = async () => {
    try {
      await apiFetch('/api/notifications/mark-all-read', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
      showToast('All notifications marked as read.', 'success');
    } catch {
      showToast('Could not update notifications.', 'error');
    }
  };

  const navLinkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

  return (
    <header className="navbar">
      <div className="nav-inner">
        <Link to={user ? '/dashboard' : '/login'} className="brand" aria-label="Seatudy home">
          <span className="brand-mark">S</span>
          <span className="brand-text">
            Seatudy
            <small>Learning, organised.</small>
          </span>
        </Link>

        <nav className={`nav-links${mobileOpen ? ' open' : ''}`} aria-label="Main navigation">
          {user ? (
            <>
              <NavLink to="/dashboard" end className={navLinkClass}>
                Dashboard
              </NavLink>

              {user.role === 'student' && (
                <>
                  <NavLink to="/dashboard/student/courses" className={navLinkClass}>
                    My Courses
                  </NavLink>
                  <NavLink to="/dashboard/student/assignments" className={navLinkClass}>
                    Assignments
                  </NavLink>
                  <NavLink to="/student/topup" className={navLinkClass}>
                    Top up
                  </NavLink>
                </>
              )}

              {user.role === 'instructor' && (
                <>
                  <NavLink to="/dashboard/instructor/courses" className={navLinkClass}>
                    My Courses
                  </NavLink>
                  <NavLink to="/dashboard/instructor/submissions" className={navLinkClass}>
                    Submissions
                  </NavLink>
                </>
              )}

              {user.role === 'admin' && (
                <>
                  <NavLink to="/dashboard/courses" className={navLinkClass}>
                    Course catalogue
                  </NavLink>
                  <NavLink to="/dashboard/admin" className={navLinkClass}>
                    Users
                  </NavLink>
                </>
              )}
            </>
          ) : (
            <NavLink to="/login" className={navLinkClass}>
              Sign in
            </NavLink>
          )}
        </nav>

        <div className="nav-actions">
          <ThemeToggle />

          {user?.role === 'student' && (
            <Link to="/student/topup" className="balance-chip" title="Top up balance">
              <FaWallet />
              <span>${Number(user.balance || 0).toFixed(2)}</span>
            </Link>
          )}

          {user && (
            <div className="notification-container" ref={notificationRef}>
              <button
                type="button"
                className="icon-button"
                onClick={() => setOpenNotifications((value) => !value)}
                aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
                aria-expanded={openNotifications}
              >
                <FaBell />
                {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>

              {openNotifications && (
                <div className="notification-dropdown">
                  <div className="notif-header">
                    <div>
                      <strong>Notifications</strong>
                      <span>{unreadCount ? `${unreadCount} unread` : 'You are all caught up'}</span>
                    </div>
                    {unreadCount > 0 && (
                      <button type="button" className="mark-read-btn" onClick={handleMarkAllRead}>
                        Mark all read
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <p className="no-notifications">Nothing new right now.</p>
                  ) : (
                    <ul>
                      {notifications.slice(0, 8).map((item) => (
                        <li key={item.id} className={item.is_read ? 'read' : ''}>
                          <span className="notif-dot" />
                          <div>
                            <p>{item.message}</p>
                            <time>{timeAgo(item.created_at)}</time>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {user && (
            <div className="user-menu" ref={userMenuRef}>
              <button
                type="button"
                className="user-trigger"
                onClick={() => setOpenUserMenu((value) => !value)}
                aria-expanded={openUserMenu}
              >
                <span className="avatar">{getInitials(user.username)}</span>
                <span className="user-trigger-text">
                  <strong>{user.username}</strong>
                  <small>{ROLE_LABEL[user.role] || user.role}</small>
                </span>
                <FaChevronDown className="chevron" />
              </button>

              {openUserMenu && (
                <div className="user-dropdown">
                  <div className="user-dropdown-head">
                    <span className="avatar large">{getInitials(user.username)}</span>
                    <div>
                      <strong>{user.username}</strong>
                      <span>{user.email}</span>
                    </div>
                  </div>
                  <Link to="/dashboard" className="user-dropdown-link">
                    Dashboard
                  </Link>
                  <button type="button" className="user-dropdown-link danger" onClick={handleLogout}>
                    <FaSignOutAlt />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}

          {user && (
            <button
              type="button"
              className="menu-toggle"
              onClick={() => setMobileOpen((value) => !value)}
              aria-label="Toggle navigation"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <FaTimes /> : <FaBars />}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
