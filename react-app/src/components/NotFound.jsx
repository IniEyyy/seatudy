import { Link } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import './NotFound.css';

function NotFound() {
  return (
    <div className="page nf-page">
      <div className="nf-card">
        <span className="nf-code">404</span>
        <h1>This page does not exist</h1>
        <p>The link may be broken, or the page may have moved somewhere else.</p>
        <div className="nf-actions">
          <Link to="/dashboard" className="btn">
            Go to dashboard
          </Link>
          <Link to="/dashboard/courses" className="btn btn-secondary">
            <FaArrowLeft />
            Browse courses
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
