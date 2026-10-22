import { useState,useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../Button/Button';
import { AuthContext } from '../../contexts/AuthContext.jsx';
import './AuthStyles.css';
// import '../Courses/CourseForm.css';

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login gagal');

      const token = data.token;
      localStorage.setItem('token', token);

      const decoded = parseJwt(token);

      if (!decoded || !decoded.role || !decoded.exp) {
        throw new Error('Token tidak valid');
      }

      const now = Date.now() / 1000;
      if (decoded.exp < now) {
        localStorage.removeItem('token');
        throw new Error('Token sudah expired');
      }

      if (res.ok) {
        login(token);
        navigate('/dashboard');
      }

    } catch (err) {
      setMessage(err.message);
    }
  };



  return (
    <div className="auth-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input name="email" placeholder="Email" onChange={handleChange} required />
        <input name="password" placeholder="Password" type="password" onChange={handleChange} required />
        <Button type="submit">Login</Button>
      </form>
      {message && <p className="error-message">{message}</p>}
      <p>
        Belum punya akun? <Link to="/register">Daftar di sini</Link>
      </p>
    </div>
  );
}

export default Login;
