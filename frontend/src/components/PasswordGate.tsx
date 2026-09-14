import React, { useState } from 'react';
import { changePassword } from '../api';
import PasswordInput from './PasswordInput';

/**
 * Erzwingt die Passwortänderung, wenn das Konto neu angelegt oder das Passwort
 * von der Verwaltung zurückgesetzt wurde. Das von der Verwaltung übergebene
 * Passwort ist nur ein Startpasswort und darf nicht dauerhaft bleiben.
 */
const PasswordGate: React.FC<{ onDone: () => void; onLogout: () => void }> = ({ onDone, onLogout }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const tooShort = next.length > 0 && next.length < 10;
  const mismatch = repeat.length > 0 && next !== repeat;
  const canSubmit = current && next.length >= 10 && next === repeat && !busy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await changePassword(current, next);
      onDone();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Passwortänderung fehlgeschlagen');
      setBusy(false);
    }
  };

  const input =
    'w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-3 h-11';

  return (
    <div className="fixed inset-0 z-[3000] bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-5 my-8">
        <h2 className="text-lg font-bold mb-1">Neues Passwort festlegen</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Ihr Passwort wurde von der Verwaltung vergeben. Bitte legen Sie jetzt ein
          eigenes Passwort fest, das nur Ihnen bekannt ist.
        </p>

        <label className="block mb-3">
          <span className="block text-sm font-medium mb-1">Bisheriges Passwort</span>
          <PasswordInput value={current} onChange={setCurrent}
                         autoComplete="current-password" required />
        </label>

        <label className="block mb-1">
          <span className="block text-sm font-medium mb-1">Neues Passwort</span>
          <PasswordInput value={next} onChange={setNext}
                         autoComplete="new-password" required />
        </label>
        <p className={`text-xs mb-3 ${tooShort ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
          Mindestens 10 Zeichen.
        </p>

        <label className="block mb-1">
          <span className="block text-sm font-medium mb-1">Neues Passwort wiederholen</span>
          <PasswordInput value={repeat} onChange={setRepeat}
                         autoComplete="new-password" required />
        </label>
        {mismatch && <p className="text-xs text-red-600 dark:text-red-400 mb-3">Die Passwörter stimmen nicht überein.</p>}

        {error && <p role="alert" className="text-red-600 dark:text-red-400 text-sm mt-3">{error}</p>}

        <button type="submit" disabled={!canSubmit}
                className="w-full mt-4 bg-mr-green hover:bg-mr-dark disabled:opacity-40 text-white h-11 rounded font-medium">
          {busy ? 'Wird gespeichert…' : 'Passwort speichern'}
        </button>
        <button type="button" onClick={onLogout}
                className="w-full mt-2 text-sm text-gray-500 dark:text-gray-400 hover:underline">
          Abmelden
        </button>
      </form>
    </div>
  );
};

export default PasswordGate;
