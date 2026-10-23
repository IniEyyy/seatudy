import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useToast } from '../../contexts/ToastContext.jsx';
import AuthShell from './AuthShell.jsx';
import './AuthStyles.css';

function Register() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    if (form.password.length < 8) {
      setMessage('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Registration failed');

      showToast('Account created. Sign in to continue.', 'success');
      navigate('/login', { replace: true });
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <div className="auth-card-head">
        <span className="eyebrow">Get started</span>
        <h2>Create your account</h2>
        <p>Join as a student. An admin can promote your account to instructor later.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="register-username">Username</label>
          <input
            id="register-username"
            className="input"
            name="username"
            type="text"
            autoComplete="username"
            placeholder="At least 3 characters"
            value={form.username}
            onChange={handleChange}
            minLength={3}
            maxLength={80}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="register-email">Email address</label>
          <input
            id="register-email"
            className="input"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="register-password">Password</label>
          <div className="password-wrap">
            <input
              id="register-password"
              className="input"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={handleChange}
              minLength={8}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        <div className="field">
          <label htmlFor="register-confirm">Confirm password</label>
          <input
            id="register-confirm"
            className="input"
            name="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Repeat your password"
            value={form.confirmPassword}
            onChange={handleChange}
            minLength={8}
            required
          />
        </div>

        {message && (
          <p className="auth-error" role="alert">
            {message}
          </p>
        )}

        <button className="btn auth-submit" type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthShell>
  );
}

export default Register;
