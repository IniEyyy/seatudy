import { useContext, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { AuthContext } from '../../contexts/AuthContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import AuthShell from './AuthShell.jsx';
import './AuthStyles.css';

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

const DEMO_ACCOUNTS = [
  { label: 'Student', email: 'student@seatudy.local', password: 'Student@123' },
  { label: 'Instructor', email: 'instructor@seatudy.local', password: 'Instructor@123' },
  { label: 'Admin', email: 'admin@seatudy.local', password: 'Admin@123' },
];

function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useContext(AuthContext);
  const { showToast } = useToast();

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const fillDemo = (account) => {
    setForm({ email: account.email, password: account.password });
    setMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setSubmitting(true);

    try {
      const res = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Sign in failed');

      const token = data.token;
      const decoded = parseJwt(token);

      if (!decoded || !decoded.exp || decoded.exp < Date.now() / 1000) {
        throw new Error('The session token is invalid. Please try again.');
      }

      login(token);
      showToast(`Welcome back, ${decoded.role}.`, 'success');
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <div className="auth-card-head">
        <span className="eyebrow">Welcome back</span>
        <h2>Sign in to Seatudy</h2>
        <p>Pick up where you left off — your courses and tasks are waiting.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="login-email">Email address</label>
          <input
            id="login-email"
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
          <label htmlFor="login-password">Password</label>
          <div className="password-wrap">
            <input
              id="login-password"
              className="input"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
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

        {message && (
          <p className="auth-error" role="alert">
            {message}
          </p>
        )}

        <button className="btn auth-submit" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="auth-demo">
        <span>Try a demo account</span>
        <div className="demo-chips">
          {DEMO_ACCOUNTS.map((account) => (
            <button key={account.label} type="button" onClick={() => fillDemo(account)}>
              {account.label}
            </button>
          ))}
        </div>
      </div>

      <p className="auth-switch">
        New to Seatudy? <Link to="/register">Create an account</Link>
      </p>
    </AuthShell>
  );
}

export default Login;
