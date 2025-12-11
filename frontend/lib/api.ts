const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function apiFetch<T>(path: string, token?: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Request failed');
  }
  return res.json();
}

export interface UserSession {
  token: string;
  email: string;
  id: string;
}

export function saveSession(session: UserSession) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('session', JSON.stringify(session));
  }
}

export function loadSession(): UserSession | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('session');
  return raw ? (JSON.parse(raw) as UserSession) : null;
}

export function clearSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('session');
  }
}
