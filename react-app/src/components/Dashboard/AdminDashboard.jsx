import { useContext, useEffect, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { AuthContext } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import './adminDashboard.css';

const ROLE_LABEL = {
  student: 'Student',
  instructor: 'Instructor',
  admin: 'Admin',
};

function AdminDashboard() {
  const { token, user } = useContext(AuthContext);
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [hideInstructors, setHideInstructors] = useState(false);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('username');
  const [sortOrder, setSortOrder] = useState('asc');
  const [dataLoaded, setDataLoaded] = useState(false);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    if (!token || !user || user.role !== 'admin') return;

    const fetchUsers = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch user list');
        setUsers(await res.json());
        setDataLoaded(true);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchUsers();
  }, [token, user]);

  const updateRole = async (userId, role) => {
    setUpdatingId(userId);
    try {
      const res = await fetch(`http://localhost:5000/api/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error('Could not update this account');
      setUsers((current) => current.map((item) => (item.id === userId ? { ...item, role } : item)));
      showToast(`Account updated to ${ROLE_LABEL[role]}.`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const visibleUsers = users
    .filter(
      (item) =>
        item.role !== 'admin' &&
        (!hideInstructors || item.role !== 'instructor') &&
        (item.username.toLowerCase().includes(search.toLowerCase()) ||
          item.email.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      const valA = a[sortField]?.toLowerCase?.() ?? '';
      const valB = b[sortField]?.toLowerCase?.() ?? '';
      return (valA < valB ? -1 : valA > valB ? 1 : 0) * (sortOrder === 'asc' ? 1 : -1);
    });

  return (
    <div className="page admin-dashboard">
      <header className="admin-header">
        <div>
          <span className="eyebrow">People</span>
          <h1>Manage accounts</h1>
          <p>Review everyone on Seatudy and change access between student and instructor.</p>
        </div>
        <span className="admin-count">{visibleUsers.length} visible</span>
      </header>

      {error && (
        <div className="courses-alert" role="alert">
          <span>{error}</span>
        </div>
      )}

      <section className="admin-panel">
        <div className="admin-toolbar">
          <div className="admin-search">
            <FaSearch />
            <input
              type="search"
              placeholder="Search name or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search users"
            />
          </div>

          <div className="admin-controls">
            <label>
              Sort
              <select value={sortField} onChange={(event) => setSortField(event.target.value)}>
                <option value="username">Name</option>
                <option value="email">Email</option>
                <option value="role">Role</option>
              </select>
            </label>
            <label>
              Order
              <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
                <option value="asc">A–Z</option>
                <option value="desc">Z–A</option>
              </select>
            </label>

            <label className="toggle-container">
              <span className="switch">
                <input
                  type="checkbox"
                  checked={hideInstructors}
                  onChange={(event) => setHideInstructors(event.target.checked)}
                />
                <span className="slider round" />
              </span>
              <span className="switch-label">Hide instructors</span>
            </label>
          </div>
        </div>

        {!dataLoaded && !error ? (
          <div className="admin-loading">
            <span className="spinner" />
            <span>Loading accounts…</span>
          </div>
        ) : visibleUsers.length === 0 ? (
          <div className="empty-state">
            <strong>No accounts match this view.</strong>
            <span>Adjust the search or hide-instructors filter.</span>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Role</th>
                  <th>Balance</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="admin-user">
                        <span className="admin-avatar">{item.username.slice(0, 2).toUpperCase()}</span>
                        <span>
                          <strong>{item.username}</strong>
                          <small>{item.email}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`role-badge role-${item.role}`}>{ROLE_LABEL[item.role] || item.role}</span>
                    </td>
                    <td className="admin-balance">${Number(item.balance || 0).toFixed(2)}</td>
                    <td>
                      {item.role === 'student' && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => updateRole(item.id, 'instructor')}
                          disabled={updatingId === item.id}
                        >
                          {updatingId === item.id ? 'Updating…' : 'Promote'}
                        </button>
                      )}
                      {item.role === 'instructor' && (
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => updateRole(item.id, 'student')}
                          disabled={updatingId === item.id}
                        >
                          {updatingId === item.id ? 'Updating…' : 'Demote'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminDashboard;
