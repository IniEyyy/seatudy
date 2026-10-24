import { useCallback, useContext, useEffect, useState } from 'react';
import { FaChevronLeft, FaChevronRight, FaSearch } from 'react-icons/fa';
import { AuthContext } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { apiFetch } from '../../lib/api';
import './adminDashboard.css';

const ROLE_LABEL = {
  student: 'Student',
  instructor: 'Instructor',
  admin: 'Admin',
};

const PAGE_SIZE = 10;

function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1, counts: {} });
  const [hideInstructors, setHideInstructors] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('username');
  const [sortOrder, setSortOrder] = useState('asc');
  const [dataLoaded, setDataLoaded] = useState(false);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadUsers = useCallback(async () => {
    if (!user || user.role !== 'admin') return;
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        exclude: 'admin',
        sort: sortField,
        order: sortOrder,
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (hideInstructors) params.set('role', 'student');

      const res = await apiFetch(`/api/users?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to fetch user list');
      setUsers(data.users || []);
      setPagination(data.pagination || { page: 1, total: 0, totalPages: 1, counts: {} });
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setDataLoaded(true);
    }
  }, [debouncedSearch, hideInstructors, page, sortField, sortOrder, user]);

  const loadAuditLogs = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/audit-logs?limit=8');
      if (res.ok) setAuditLogs(await res.json());
    } catch {
      setAuditLogs([]);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const updateRole = async (userId, role) => {
    setUpdatingId(userId);
    try {
      const res = await apiFetch(`/api/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not update this account');
      showToast(`Account updated to ${ROLE_LABEL[role]}.`, 'success');
      await Promise.all([loadUsers(), loadAuditLogs()]);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="page admin-dashboard">
      <header className="admin-header">
        <div>
          <span className="eyebrow">People</span>
          <h1>Manage accounts</h1>
          <p>Review everyone on Seatudy and change access between student and instructor.</p>
        </div>
        <span className="admin-count">{pagination.total} accounts</span>
      </header>

      {error && (
        <div className="courses-alert" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-secondary" onClick={loadUsers}>
            Try again
          </button>
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
              <select
                value={sortField}
                onChange={(event) => {
                  setSortField(event.target.value);
                  setPage(1);
                }}
              >
                <option value="username">Name</option>
                <option value="email">Email</option>
                <option value="role">Role</option>
                <option value="balance">Balance</option>
              </select>
            </label>
            <label>
              Order
              <select
                value={sortOrder}
                onChange={(event) => {
                  setSortOrder(event.target.value);
                  setPage(1);
                }}
              >
                <option value="asc">A-Z</option>
                <option value="desc">Z-A</option>
              </select>
            </label>

            <label className="toggle-container">
              <span className="switch">
                <input
                  type="checkbox"
                  checked={hideInstructors}
                  onChange={(event) => {
                    setHideInstructors(event.target.checked);
                    setPage(1);
                  }}
                />
                <span className="slider round" />
              </span>
              <span className="switch-label">Students only</span>
            </label>
          </div>
        </div>

        {!dataLoaded && !error ? (
          <div className="admin-loading">
            <span className="spinner" />
            <span>Loading accounts...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <strong>No accounts match this view.</strong>
            <span>Adjust the search or students-only filter.</span>
          </div>
        ) : (
          <>
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
                  {users.map((item) => (
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
                            {updatingId === item.id ? 'Updating...' : 'Promote'}
                          </button>
                        )}
                        {item.role === 'instructor' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => updateRole(item.id, 'student')}
                            disabled={updatingId === item.id}
                          >
                            {updatingId === item.id ? 'Updating...' : 'Demote'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-pagination">
              <span>
                Page {pagination.page} of {pagination.totalPages} - {pagination.total} total
              </span>
              <div>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={pagination.page <= 1}
                >
                  <FaChevronLeft /> Previous
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setPage((value) => value + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next <FaChevronRight />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="admin-panel admin-audit">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Audit trail</span>
            <h2>Recent admin activity</h2>
          </div>
        </div>
        {auditLogs.length === 0 ? (
          <p className="admin-muted">Role changes will appear here.</p>
        ) : (
          <ul className="admin-audit-list">
            {auditLogs.map((log) => (
              <li key={log.id}>
                <strong>{log.actor_name || 'Admin'}</strong>
                <span>
                  changed <b>{log.metadata?.username || `user #${log.entity_id}`}</b> from{' '}
                  {log.metadata?.from || 'unknown'} to {log.metadata?.to || 'unknown'}
                </span>
                <time>{new Date(log.created_at).toLocaleString()}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default AdminDashboard;
