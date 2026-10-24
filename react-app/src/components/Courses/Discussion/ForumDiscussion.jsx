import { useCallback, useContext, useEffect, useState } from 'react';
import { FaEdit, FaPaperPlane, FaReply, FaTrashAlt } from 'react-icons/fa';
import { AuthContext } from '../../../contexts/AuthContext';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { apiFetch } from '../../../lib/api';
import './forumDiscussion.css';

const initials = (name = '?') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

const wasEdited = (message) =>
  message.updated_at && new Date(message.updated_at) - new Date(message.created_at) > 1000;

function MessageItem({
  message,
  user,
  moderator,
  onReply,
  onEdit,
  onDelete,
  replyTo,
  setReplyTo,
  replyText,
  setReplyText,
  posting,
  submitReply,
}) {
  const own = message.user_id === user?.id;
  const canDelete = own || moderator;

  return (
    <li className="fd-message">
      <span className="fd-avatar">{initials(message.username)}</span>
      <div className="fd-body">
        <div className="fd-meta">
          <strong>{message.username}</strong>
          {message.role === 'instructor' && <span className="fd-role">Instructor</span>}
          <span>{new Date(message.created_at).toLocaleString()}</span>
          {wasEdited(message) && <span className="fd-edited">edited</span>}
        </div>
        <p>{message.message}</p>

        <div className="fd-actions">
          <button type="button" onClick={() => onReply(message.id)}>
            <FaReply /> Reply
          </button>
          {own && (
            <button type="button" onClick={() => onEdit(message)}>
              <FaEdit /> Edit
            </button>
          )}
          {canDelete && (
            <button type="button" className="is-danger" onClick={() => onDelete(message.id)}>
              <FaTrashAlt /> Delete
            </button>
          )}
        </div>

        {replyTo === message.id && (
          <form className="fd-reply-form" onSubmit={submitReply}>
            <textarea
              className="input"
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              placeholder={`Reply to ${message.username}`}
              required
            />
            <div className="fd-reply-actions">
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setReplyTo(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-sm" disabled={posting}>
                {posting ? 'Posting...' : 'Post reply'}
              </button>
            </div>
          </form>
        )}

        {message.replies?.length > 0 && (
          <ul className="fd-replies">
            {message.replies.map((reply) => (
              <li key={reply.id}>
                <div className="fd-meta">
                  <strong>{reply.username}</strong>
                  {reply.role === 'instructor' && <span className="fd-role">Instructor</span>}
                  <span>{new Date(reply.created_at).toLocaleString()}</span>
                </div>
                <p>{reply.message}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

function ForumDiscussion({ courseId }) {
  const { user } = useContext(AuthContext);
  const { confirm } = useConfirm();
  const [messages, setMessages] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [moderator, setModerator] = useState(false);
  const [page, setPage] = useState(1);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [editing, setEditing] = useState(null);
  const [editText, setEditText] = useState('');

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/student/forum/${courseId}?page=${page}&limit=20`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to load forum');
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      setModerator(Boolean(data.moderator));
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load forum');
    } finally {
      setLoading(false);
    }
  }, [courseId, page]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const postMessage = async (payload) => {
    setPosting(true);
    try {
      const res = await apiFetch(`/api/student/forum/${courseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Post failed');
      setNewMessage('');
      setReplyText('');
      setReplyTo(null);
      setError('');
      await fetchMessages();
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!newMessage.trim()) return;
    postMessage({ message: newMessage });
  };

  const submitReply = (event) => {
    event.preventDefault();
    if (!replyText.trim() || !replyTo) return;
    postMessage({ message: replyText, parentId: replyTo });
  };

  const startEdit = (message) => {
    setEditing(message.id);
    setEditText(message.message);
  };

  const saveEdit = async (messageId) => {
    if (!editText.trim()) return;
    try {
      const res = await apiFetch(`/api/student/forum/${courseId}/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: editText }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not update message');
      setEditing(null);
      setEditText('');
      await fetchMessages();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteMessage = async (messageId) => {
    const approved = await confirm({
      title: 'Delete this message?',
      message: 'Any replies to it will be removed too.',
      confirmLabel: 'Delete message',
      tone: 'danger',
    });
    if (!approved) return;
    try {
      const res = await apiFetch(`/api/student/forum/${courseId}/${messageId}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not delete message');
      await fetchMessages();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="fd">
      <form onSubmit={handleSubmit} className="fd-composer">
        <textarea
          className="input"
          placeholder="Ask a question or share what you found..."
          value={newMessage}
          onChange={(event) => setNewMessage(event.target.value)}
          required
        />
        <button type="submit" className="btn" disabled={posting}>
          <FaPaperPlane />
          {posting ? 'Posting...' : 'Post'}
        </button>
      </form>

      {error && <div className="fd-error">{error}</div>}

      {loading ? (
        <div className="fd-loading">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="fd-skeleton skeleton" />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="empty-state">
          <strong>No messages yet.</strong>
          <span>Start the discussion - your instructor and classmates can reply here.</span>
        </div>
      ) : (
        <>
          <ul className="fd-messages">
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                user={user}
                moderator={moderator}
                onReply={(id) => {
                  setReplyTo(id);
                  setReplyText('');
                }}
                onEdit={startEdit}
                onDelete={deleteMessage}
                replyTo={replyTo}
                setReplyTo={setReplyTo}
                replyText={replyText}
                setReplyText={setReplyText}
                posting={posting}
                submitReply={submitReply}
              />
            ))}
          </ul>

          {editing && (
            <form
              className="fd-edit-form"
              onSubmit={(event) => {
                event.preventDefault();
                saveEdit(editing);
              }}
            >
              <label className="field">
                <span>Edit message</span>
                <textarea
                  className="input"
                  value={editText}
                  onChange={(event) => setEditText(event.target.value)}
                  required
                />
              </label>
              <div className="fd-reply-actions">
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => setEditing(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-sm">
                  Save changes
                </button>
              </div>
            </form>
          )}

          {pagination.totalPages > 1 && (
            <div className="fd-pagination">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ForumDiscussion;
