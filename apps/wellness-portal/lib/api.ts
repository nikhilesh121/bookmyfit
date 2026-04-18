const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';
const TOKEN_KEY = 'bmf_wellness_token';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function redirectToLogin() {
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

async function request<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}/api/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem(TOKEN_KEY);
    redirectToLogin();
    throw new Error('Session expired');
  }
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  get: <T = any>(p: string) => request<T>(p),
  post: <T = any>(p: string, b?: any) => request<T>(p, { method: 'POST', body: b ? JSON.stringify(b) : undefined }),
  put: <T = any>(p: string, b?: any) => request<T>(p, { method: 'PUT', body: b ? JSON.stringify(b) : undefined }),
  patch: <T = any>(p: string, b?: any) => request<T>(p, { method: 'PATCH', body: b ? JSON.stringify(b) : undefined }),
  del: <T = any>(p: string) => request<T>(p, { method: 'DELETE' }),
};

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('bmf_wellness_user');
  localStorage.removeItem('bmf_wellness_partner_id');
  redirectToLogin();
};

export const getUser = () => {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('bmf_wellness_user') || 'null'); } catch { return null; }
};

export const getPartnerId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('bmf_wellness_partner_id');
};
