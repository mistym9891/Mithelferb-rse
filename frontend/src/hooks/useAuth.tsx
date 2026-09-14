import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User } from '../types';
import { getMe } from '../api';

interface AuthContextValue {
  user: User | null;
  /** true, solange der Stand beim Server noch nicht bestätigt wurde. */
  checking: boolean;
  loginUser: (user: User, token: string) => void;
  logout: () => void;
  /** Holt Rolle, Zustimmungs- und Passwortstatus frisch vom Server. */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): User | null {
  try {
    const stored = localStorage.getItem('user');
    return stored ? (JSON.parse(stored) as User) : null;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Aus dem Speicher vorbelegen, damit nach dem Neuladen nicht kurz die
  // Anmeldemaske aufblitzt – der Server bestätigt gleich darauf.
  const [user, setUser] = useState<User | null>(readStoredUser);
  const [checking, setChecking] = useState<boolean>(!!readStoredUser());

  const store = useCallback((u: User | null) => {
    setUser(u);
    if (u) localStorage.setItem('user', JSON.stringify(u));
    else localStorage.removeItem('user');
  }, []);

  const loginUser = useCallback((u: User, token: string) => {
    localStorage.setItem('token', token);
    store(u);
  }, [store]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem('token')) { setChecking(false); return; }
    try {
      const res = await getMe();
      store(res.data.user);
    } catch (err: any) {
      // 401 räumt der Antwort-Interceptor auf; bei Netzfehlern behalten wir
      // den gespeicherten Stand, damit ein Funkloch niemanden abmeldet.
      if (err.response?.status === 401 || err.response?.status === 403) logout();
    } finally {
      setChecking(false);
    }
  }, [store, logout]);

  // Beim Start einmal den Serverstand holen (Rolle kann sich geändert haben).
  useEffect(() => { refreshUser(); }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ user, checking, loginUser, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
