import React, { useEffect, useState, useContext, useCallback } from 'react';
import { AuthContext } from '../../../contexts/AuthContext';
import './forumDiscussion.css';

function ForumDiscussion({ courseId }) {
  const { token, user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/student/forum/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch forum');
      const data = await res.json();
      console.log('Fetched forum messages:', data);
      if (!Array.isArray(data)) throw new Error('Invalid response from server');
      setMessages(data);
    } catch {
      setError('Failed to load forum');
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

    try {
      const res = await fetch(`http://localhost:5000/api/student/forum/${courseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: newMessage })
      });

      if (res.ok) {
        setNewMessage('');
        fetchMessages();
      } else {
        const errData = await res.json();
        setError(errData.message || 'Post failed');
      }
    } catch {
      setError('Failed to post message');
    }
  };

  return (
    <div className="forum">
      <h3>Discussion Forum</h3>

      {user && user.role === 'student' && (
        <form onSubmit={handleSubmit} className="forum-form">
          <textarea
            placeholder="Write your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            required
          />
          <button type="submit">Post</button>
        </form>
      )}

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p>Loading messages...</p>
      ) : (
        <ul className="forum-messages">
          {messages.length === 0 ? (
            <li><em>No messages yet.</em></li>
          ) : (
            messages.map((msg) => (
              <li key={msg.id}>
                <strong>{msg.username}</strong>{' '}
                <em>({new Date(msg.created_at).toLocaleString()})</em>
                <p>{msg.message}</p>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export default ForumDiscussion;
