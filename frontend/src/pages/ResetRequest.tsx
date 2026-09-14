import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getResetRequest, generateResetPassword } from '../api';

/**
 * Ziel des Links, den die Ring-Administration bei einer Passwortanfrage
 * erhält. Nur Administratoren des betroffenen Rings (und der Super-Admin)
 * können hier ein neues Passwort erzeugen.
 */
const ResetRequestPage: React.FC = () => {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState<any>(null);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getResetRequest(token)
      .then(r => setInfo(r.data.request))
      .catch(err => setError(err.response?.data?.error || 'Die Anfrage konnte nicht geladen werden.'));
  }, [token]);

  const generate = async () => {
    setBusy(true); setError('');
    try {
      const r = await generateResetPassword(token);
      setPassword(r.data.newPassword);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Das Passwort konnte nicht erzeugt werden.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 overflow-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md w-full max-w-md p-5">
        <h2 className="text-lg font-bold mb-3">Passwort zurücksetzen</h2>

        {error && <p role="alert" className="text-red-600 dark:text-red-400 text-sm mb-3">{error}</p>}

        {info && !password && (
          <>
            <dl className="text-sm space-y-1 mb-4">
              <div><dt className="inline font-medium">Person: </dt><dd className="inline">{info.userName || info.userEmail}</dd></div>
              <div><dt className="inline font-medium">E-Mail: </dt><dd className="inline break-all">{info.userEmail}</dd></div>
              <div><dt className="inline font-medium">Ring: </dt><dd className="inline">{info.ringName}</dd></div>
              <div><dt className="inline font-medium">Gültig bis: </dt><dd className="inline">{new Date(info.expiresAt).toLocaleString('de-DE')}</dd></div>
            </dl>

            {info.handled && <p className="text-amber-700 dark:text-amber-400 text-sm mb-3">Diese Anfrage wurde bereits bearbeitet.</p>}
            {info.expired && <p className="text-amber-700 dark:text-amber-400 text-sm mb-3">Diese Anfrage ist abgelaufen.</p>}

            <button onClick={generate} disabled={busy || info.handled || info.expired || info.cancelled}
                    className="w-full bg-mr-green hover:bg-mr-dark disabled:opacity-40 text-white h-11 rounded font-medium">
              {busy ? 'Wird erzeugt…' : 'Neues Passwort erzeugen'}
            </button>
          </>
        )}

        {password && (
          <>
            <p className="text-sm mb-2">Neues Passwort für <strong>{info?.userName || info?.userEmail}</strong>:</p>
            <div className="bg-gray-100 dark:bg-gray-900 rounded p-3 font-mono text-lg text-center select-all break-all">
              {password}
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-3">
              Bitte <strong>persönlich</strong> übergeben – nicht per E-Mail oder Messenger.
              Die Person muss es bei der ersten Anmeldung ändern.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Das Passwort wird nur jetzt angezeigt.
            </p>
          </>
        )}

        <button onClick={() => navigate('/dashboard')}
                className="w-full mt-4 text-sm text-gray-500 dark:text-gray-400 hover:underline">
          Zurück zur App
        </button>
      </div>
    </div>
  );
};

export default ResetRequestPage;
