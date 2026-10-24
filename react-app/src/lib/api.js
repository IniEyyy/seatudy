const configuredApiUrl = import.meta.env.VITE_API_URL;
const fallbackApiUrl = import.meta.env.PROD ? '' : 'http://localhost:5000';

export const API_URL = (
  configuredApiUrl === '' ? '' : configuredApiUrl || fallbackApiUrl
).replace(/\/$/, '');

let refreshPromise = null;

const getStoredToken = () => {
  try {
    return localStorage.getItem('token') || '';
  } catch {
    return '';
  }
};

export function setStoredToken(token) {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
}

export function clearSession() {
  setStoredToken('');
  localStorage.removeItem('role');
  window.dispatchEvent(new Event('seatudy:session-expired'));
}

export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = await res.json().catch(() => ({}));
        if (!data.token) return null;
        setStoredToken(data.token);
        window.dispatchEvent(new CustomEvent('seatudy:token-refreshed', { detail: { token: data.token } }));
        return data.token;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

const isAuthEntry = (path) =>
  path.startsWith('/api/login') || path.startsWith('/api/register');

export async function downloadFile(path, filename) {
  const res = await apiFetch(path);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Could not download this file');
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'download';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function apiFetch(path, options = {}) {
  const { retry = true, ...init } = options;
  const headers = new Headers(init.headers || {});
  const token = getStoredToken();

  if (token && !isAuthEntry(path)) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers,
  });

  if (
    response.status === 401 &&
    retry &&
    !isAuthEntry(path) &&
    !path.startsWith('/api/auth/')
  ) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiFetch(path, { ...options, retry: false });
    }
    clearSession();
  }

  return response;
}
