import { createContext, useCallback, useContext, useEffect, useState } from 'react';

type User = { userId: number; email: string; displayName: string };

const AuthContext = createContext<{
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  isReady: boolean;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (token && user) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }, [token, user]);

  useEffect(() => {
    const onAuthChange = () => {
      setToken(localStorage.getItem('token'));
      try {
        const u = localStorage.getItem('user');
        setUser(u ? JSON.parse(u) : null);
      } catch {
        setUser(null);
      }
    };
    window.addEventListener('auth-change', onAuthChange);
    setIsReady(true);
    return () => window.removeEventListener('auth-change', onAuthChange);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { login: apiLogin } = await import('../api');
    const res = await apiLogin(email, password);
    setToken(res.token);
    setUser({ userId: res.userId, email: res.email, displayName: res.displayName });
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify({ userId: res.userId, email: res.email, displayName: res.displayName }));
  }, []);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    const { register: apiRegister } = await import('../api');
    const res = await apiRegister(email, password, displayName);
    setToken(res.token);
    setUser({ userId: res.userId, email: res.email, displayName: res.displayName });
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify({ userId: res.userId, email: res.email, displayName: res.displayName }));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
