import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, forgotPassword } from '../api';
import { useAuth } from '../hooks/useAuth';
import PasswordInput from '../components/PasswordInput';

const inputCls =
  'w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-3 h-11';

const Login: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setInfo(''); setBusy(true);
    try {
      const res = await login(email, password);
      loginUser(res.data.user, res.data.token);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        (err.code === 'ERR_NETWORK'
          ? 'Der Server ist nicht erreichbar. Bitte Internetverbindung prüfen.'
          : 'Anmeldung fehlgeschlagen')
      );
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setInfo(''); setBusy(true);
    try {
      const res = await forgotPassword(email);
      setInfo(res.data.message);
    } catch {
      setError('Die Anfrage konnte nicht gesendet werden. Bitte später erneut versuchen.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4 py-8 overflow-auto">
      <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-md w-full max-w-sm">
        <img src="/icon-192.png" alt="Maschinenring" className="h-16 w-16 mx-auto mb-4 object-contain" />
        <h2 className="text-xl font-bold mb-1 text-center text-gray-900 dark:text-gray-100">Mithelferbörse</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">Maschinenringe Sozialdienst</p>

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">E-Mail</label>
              <input id="email" type="email" inputMode="email" autoCapitalize="none" autoComplete="username"
                     value={email} onChange={e => setEmail(e.target.value)} className={inputCls} required />
            </div>
            <div className="mb-2">
              <label htmlFor="password" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Passwort</label>
              <PasswordInput id="password" value={password} onChange={setPassword}
                             autoComplete="current-password" required />
            </div>
            <button type="button"
                    onClick={() => { setMode('forgot'); setError(''); setInfo(''); }}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4">
              Passwort vergessen?
            </button>

            {error && <p role="alert" className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>}

            <button type="submit" disabled={busy}
                    className="w-full bg-mr-green hover:bg-mr-dark disabled:opacity-50 text-white h-11 rounded font-medium">
              {busy ? 'Anmelden…' : 'Anmelden'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgot}>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Geben Sie Ihre dienstliche E-Mail-Adresse an. Ihre Ringverwaltung erhält
              die Anfrage, erzeugt ein neues Passwort und übergibt es Ihnen persönlich.
            </p>
            <div className="mb-4">
              <label htmlFor="femail" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">E-Mail</label>
              <input id="femail" type="email" inputMode="email" autoCapitalize="none" autoComplete="username"
                     value={email} onChange={e => setEmail(e.target.value)} className={inputCls} required />
            </div>

            {error && <p role="alert" className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>}
            {info && (
              <p className="text-green-700 dark:text-green-400 text-sm mb-4 bg-green-50 dark:bg-green-900/25 rounded p-2">
                {info}
              </p>
            )}

            <button type="submit" disabled={busy}
                    className="w-full bg-mr-green hover:bg-mr-dark disabled:opacity-50 text-white h-11 rounded font-medium">
              {busy ? 'Wird gesendet…' : 'Anfrage senden'}
            </button>
            <button type="button"
                    onClick={() => { setMode('login'); setError(''); setInfo(''); }}
                    className="w-full mt-2 text-sm text-gray-500 dark:text-gray-400 hover:underline">
              Zurück zur Anmeldung
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
