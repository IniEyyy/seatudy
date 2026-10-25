import { useContext } from 'react';
import { FaMoon, FaSun } from 'react-icons/fa';
import { ThemeContext } from '../../contexts/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const label = `Switch to ${nextTheme} theme.`;

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      {theme === 'dark' ? <FaSun /> : <FaMoon />}
    </button>
  );
}
