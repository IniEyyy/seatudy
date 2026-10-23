import { Link } from 'react-router-dom';

export default function AuthShell({ children }) {
  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <Link to="/login" className="auth-brand">
          <span className="auth-brand-mark">S</span>
          <span>
            Seatudy
            <small>Learning, organised.</small>
          </span>
        </Link>

        <div className="auth-aside-copy">
          <span className="auth-kicker">One calm place to learn</span>
          <h1>
            Learn deliberately.
            <br />
            Teach clearly.
          </h1>
          <p>
            Courses, materials, assignments, reviews, and conversations — connected in a workspace
            built for focused study.
          </p>
          <ul className="auth-points">
            <li>
              <span>01</span>
              Structured courses with materials in one place
            </li>
            <li>
              <span>02</span>
              Feedback and scores that are easy to act on
            </li>
            <li>
              <span>03</span>
              Real-time updates when something needs you
            </li>
          </ul>
        </div>

        <p className="auth-aside-footer">A full-stack learning platform for students and instructors.</p>
      </aside>

      <main className="auth-main">
        <div className="auth-card">{children}</div>
      </main>
    </div>
  );
}
