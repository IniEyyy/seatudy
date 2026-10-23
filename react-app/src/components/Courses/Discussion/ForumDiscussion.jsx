import { useCallback, useContext, useEffect, useState } from 'react';
import { FaPaperPlane } from 'react-icons/fa';
import { AuthContext } from '../../../contexts/AuthContext';
import './forumDiscussion.css';

const API = 'http://localhost:5000';

const initials = (name = '?') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

function ForumDiscussion({ courseId }) {
  const { token, user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/student/forum/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data.message || 'Failed to load forum');
      if (!Array.isArray(data)) throw new Error('Invalid response from server');
      setMessages(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load forum');
    } finally {
      setLoading(false);
    }
  }, [courseId, token]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setPosting(true);
    try {
      const res = await fetch(`${API}/api/student/forum/${courseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: newMessage }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Post failed');

      setNewMessage('');
      setError('');
      fetchMessages();
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="fd">
      {user?.role === 'student' && (
        <form onSubmit={handleSubmit} className="fd-composer">
          <textarea
            className="input"
            placeholder="Ask a question or share what you found…"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            required
          />
          <button type="submit" className="btn" disabled={posting}>
            <FaPaperPlane />
            {posting ? 'Posting…' : 'Post'}
          </button>
        </form>
      )}

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
          <span>Start the discussion — your instructor and classmates can reply here.</span>
        </div>
      ) : (
        <ul className="fd-messages">
          {messages.map((msg) => (
            <li key={msg.id} className="fd-message">
              <span className="fd-avatar">{initials(msg.username)}</span>
              <div className="fd-body">
                <div className="fd-meta">
                  <strong>{msg.username}</strong>
                  <span>{new Date(msg.created_at).toLocaleString()}</span>
                </div>
                <p>{msg.message}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ForumDiscussion;
