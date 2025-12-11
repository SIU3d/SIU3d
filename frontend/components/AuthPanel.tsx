import { useEffect, useState } from 'react';
import { apiFetch, loadSession, saveSession, clearSession, UserSession } from '../lib/api';

interface Props {
  onAuthChange: (session: UserSession | null) => void;
}

export default function AuthPanel({ onAuthChange }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = loadSession();
    if (session) {
      onAuthChange(session);
    }
  }, [onAuthChange]);

  const handleSubmit = async () => {
    try {
      setError(null);
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await apiFetch<{ token: string; user: { id: string; email: string } }>(path, undefined, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const session: UserSession = { token: res.token, email: res.user.email, id: res.user.id };
      saveSession(session);
      onAuthChange(session);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    clearSession();
    onAuthChange(null);
  };

  return (
    <div className="bg-white p-4 rounded shadow space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{mode === 'login' ? 'Login' : 'Register'}</h2>
        <button className="text-blue-600 text-sm" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          Switch to {mode === 'login' ? 'Register' : 'Login'}
        </button>
      </div>
      <input
        className="w-full border rounded px-3 py-2"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        className="w-full border rounded px-3 py-2"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex items-center gap-2">
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleSubmit}>
          {mode === 'login' ? 'Login' : 'Register'}
        </button>
        <button className="text-sm text-gray-600" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}
