import { useContext } from 'react';
import { FaDesktop, FaMoon, FaSun } from 'react-icons/fa';
import { ThemeContext } from '../../contexts/ThemeContext';

const MODE_LABEL = {
  system: 'System theme',
  light: 'Light theme',
  dark: 'Dark theme',
};

export default function ThemeToggle({ className = '' }) {
  const { mode, theme, cycleTheme } = useContext(ThemeContext);
  const label = `${MODE_LABEL[mode]} (${theme}). Change theme.`;
  const Icon = mode === 'system' ? FaDesktop : theme === 'dark' ? FaSun : FaMoon;

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={cycleTheme}
      aria-label={label}
      title={label}
    >
      <Icon />
    </button>
  );
}
