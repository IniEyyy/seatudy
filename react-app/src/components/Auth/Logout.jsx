import { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';

function Logout() {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

  useEffect(() => {
    let active = true;
    logout().finally(() => {
      if (active) navigate('/login', { replace: true });
    });
    return () => {
      active = false;
    };
  }, [logout, navigate]);

  return null;
}

export default Logout;
