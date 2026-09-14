import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { toast } from 'react-toastify';
import { getNetworkInfo } from '../api';
import { usePush } from '../hooks/usePush';

/**
 * „App installieren“ – ein Dialog für beides:
 *   1. Installation auf Rechner und Handy (ohne App-Store, per Link/QR-Code)
 *   2. Benachrichtigungen einschalten
 *
 * Die Installation läuft über die Browserfunktion „App installieren“ bzw.
 * „Zum Startbildschirm hinzufügen“. Danach liegt das Symbol wie bei einer
 * normalen App auf dem Desktop bzw. dem Startbildschirm.
 */

/** Vom Browser angebotenes Installationsereignis (nicht in den TS-Typen). */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: InstallPromptEvent | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as InstallPromptEvent;
    window.dispatchEvent(new CustomEvent('installable'));
  });
}

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as any).standalone === true;

const InstallDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [tab, setTab] = useState<'install' | 'notify'>('install');
  const [canPrompt, setCanPrompt] = useState(!!deferredPrompt);
  const [installed, setInstalled] = useState(isStandalone());
  const [dataUrl, setDataUrl] = useState('');
  const [candidates, setCandidates] = useState<string[]>([]);
  const [url, setUrl] = useState(window.location.origin);
  const [copied, setCopied] = useState(false);

  const push = usePush();

  useEffect(() => {
    const onInstallable = () => setCanPrompt(true);
    const onInstalled = () => { setInstalled(true); setCanPrompt(false); };
    window.addEventListener('installable', onInstallable);
    window.addEventListener('appinstalled', onInstalled);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('installable', onInstallable);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Adresse bestimmen – "localhost" wäre auf dem Handy das Handy selbst.
  useEffect(() => {
    const origin = window.location.origin;
    if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(origin)) {
      getNetworkInfo()
        .then(r => {
          const port = window.location.port || String(r.data.frontendPort);
          const lan = r.data.lanAddresses
            .filter(a => !a.startsWith('172.'))     // WSL/Hyper-V nützen dem Handy nichts
            .map(a => `http://${a}:${port}`);
          const all = [...(r.data.appUrl ? [r.data.appUrl] : []), ...lan, origin];
          setCandidates(all);
          setUrl(all[0]);
        })
        .catch(() => setCandidates([origin]));
    } else {
      setCandidates([origin]);
    }
  }, []);

  useEffect(() => {
    const dark = document.documentElement.classList.contains('dark');
    QRCode.toDataURL(url, {
      width: 512, margin: 2, errorCorrectionLevel: 'M',
      color: dark ? { dark: '#e5e7eb', light: '#111827' } : { dark: '#1f2937', light: '#ffffff' },
    }).then(setDataUrl).catch(() => setDataUrl(''));
  }, [url]);

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    deferredPrompt = null;
    setCanPrompt(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* Zwischenablage nicht verfügbar */ }
  };

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Maschinenringe Mithelferbörse', url }); } catch { /* abgebrochen */ }
    } else copy();
  };

  const insecure = !window.isSecureContext;
  const tabBtn = (id: 'install' | 'notify', label: string) => (
    <button
      onClick={() => setTab(id)}
      className={`flex-1 h-10 text-sm font-medium border-b-2 ${
        tab === id
          ? 'border-mr-green text-mr-green dark:border-mr-light dark:text-mr-light'
          : 'border-transparent text-gray-500 dark:text-gray-400'
      }`}
    >
      {label}
    </button>
  );

  const pushLabel: Record<string, string> = {
    on: 'Benachrichtigungen sind eingeschaltet',
    off: 'Benachrichtigungen sind ausgeschaltet',
    denied: 'Im Browser blockiert',
    unsupported: 'Dieser Browser unterstützt keine Benachrichtigungen',
    insecure: 'Benötigt HTTPS',
    busy: 'einen Moment …',
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/50 flex items-center justify-center p-3 overflow-y-auto"
         onClick={onClose} role="dialog" aria-modal="true" aria-label="App installieren">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md my-8"
           onClick={e => e.stopPropagation()}>
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabBtn('install', 'Installieren')}
          {tabBtn('notify', 'Benachrichtigungen')}
        </div>

        {tab === 'install' && (
          <div className="p-5 text-center">
            {installed ? (
              <p className="text-green-700 dark:text-green-400 text-sm mb-4 bg-green-50 dark:bg-green-900/25 rounded p-3">
                Diese App ist auf dem Gerät installiert und läuft im eigenen Fenster.
              </p>
            ) : canPrompt ? (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Die App kann auf diesem Gerät installiert werden. Danach liegt das Symbol
                  wie bei einer normalen App auf dem Desktop bzw. Startbildschirm.
                </p>
                <button onClick={install}
                        className="w-full bg-mr-green hover:bg-mr-dark text-white h-11 rounded font-medium mb-4">
                  Jetzt installieren
                </button>
              </>
            ) : (
              <div className="text-left text-sm text-gray-600 dark:text-gray-400 mb-4 space-y-2">
                <p className="font-medium text-gray-800 dark:text-gray-200">So wird installiert:</p>
                {isIOS() ? (
                  <p><strong>iPhone/iPad (Safari):</strong> Teilen-Symbol <span aria-hidden="true">⎋</span> antippen →
                     „Zum Home-Bildschirm“ → „Hinzufügen“.</p>
                ) : (
                  <>
                    <p><strong>Android (Chrome):</strong> Menü <span aria-hidden="true">⋮</span> →
                       „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.</p>
                    <p><strong>Windows/Mac (Chrome, Edge):</strong> Symbol in der Adressleiste
                       <span aria-hidden="true"> ⊕ </span> oder Menü → „Installieren“.</p>
                  </>
                )}
                {insecure && (
                  <p className="text-amber-700 dark:text-amber-400">
                    Über <code>http://</code> bietet der Browser die Installation nicht an.
                    Dafür ist die Veröffentlichung mit HTTPS nötig.
                  </p>
                )}
              </div>
            )}

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Auf ein anderes Gerät übertragen – QR-Code scannen oder Link weitergeben:
            </p>
            {dataUrl
              ? <img src={dataUrl} alt={`QR-Code für ${url}`}
                     className="mx-auto w-44 h-44 rounded border border-gray-200 dark:border-gray-700" />
              : <div className="mx-auto w-44 h-44 grid place-items-center text-sm text-gray-400">…</div>}

            {candidates.length > 1 && (
              <select value={url} onChange={e => setUrl(e.target.value)}
                      className="mt-3 w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700
                                 dark:text-gray-100 rounded h-9 text-sm px-2">
                {candidates.map(c => (
                  <option key={c} value={c}>
                    {/^https?:\/\/(localhost|127\.)/i.test(c) ? `${c} (nur dieser Rechner)` : c}
                  </option>
                ))}
              </select>
            )}
            <p className="mt-2 break-all text-xs font-mono text-gray-600 dark:text-gray-400">{url}</p>

            <div className="mt-4 flex gap-2">
              <button onClick={copy}
                      className="flex-1 border border-gray-300 dark:border-gray-600 rounded h-10 text-sm">
                {copied ? 'Kopiert ✓' : 'Link kopieren'}
              </button>
              <button onClick={share}
                      className="flex-1 bg-mr-green hover:bg-mr-dark text-white rounded h-10 text-sm font-medium">
                Teilen
              </button>
            </div>
          </div>
        )}

        {tab === 'notify' && (
          <div className="p-5">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Mit eingeschalteten Benachrichtigungen erfahren Sie von neuen Freimeldungen
              auch dann, wenn die App gerade <strong>nicht geöffnet</strong> ist.
            </p>

            <div className="rounded border border-gray-200 dark:border-gray-700 p-3 mb-3">
              <div className="flex items-center gap-2 text-sm">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                  push.state === 'on' ? 'bg-green-500'
                  : push.state === 'busy' ? 'bg-amber-500 animate-pulse' : 'bg-gray-400'
                }`} />
                <span>{pushLabel[push.state] ?? push.state}</span>
              </div>
              {push.state === 'on' && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {push.devices} {push.devices === 1 ? 'Gerät' : 'Geräte'} für dieses Konto angemeldet.
                </p>
              )}
            </div>

            {push.error && <p role="alert" className="text-red-600 dark:text-red-400 text-sm mb-3">{push.error}</p>}

            {push.state === 'off' && (
              <button onClick={push.enable}
                      className="w-full bg-mr-green hover:bg-mr-dark text-white h-11 rounded font-medium">
                Benachrichtigungen einschalten
              </button>
            )}
            {push.state === 'on' && (
              <div className="flex gap-2">
                <button onClick={async () => { (await push.sendTest()) && toast.info('Testmeldung verschickt'); }}
                        className="flex-1 border border-gray-300 dark:border-gray-600 rounded h-11 text-sm">
                  Testmeldung
                </button>
                <button onClick={push.disable}
                        className="flex-1 border border-gray-300 dark:border-gray-600 rounded h-11 text-sm">
                  Ausschalten
                </button>
              </div>
            )}
            {push.state === 'denied' && (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Benachrichtigungen wurden für diese Seite blockiert. Bitte in den
                Browsereinstellungen (Schloss-Symbol in der Adressleiste) wieder erlauben.
              </p>
            )}
            {push.state === 'insecure' && (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Benachrichtigungen brauchen HTTPS. Über <code>localhost</code> funktionieren sie,
                über eine <code>http://</code>-Netzwerkadresse nicht – dafür ist die
                Veröffentlichung mit TLS-Zertifikat nötig.
              </p>
            )}
            {isIOS() && !isStandalone() && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                Auf iPhone und iPad sind Benachrichtigungen erst möglich, wenn die App
                über „Zum Home-Bildschirm“ installiert wurde (ab iOS 16.4).
              </p>
            )}
          </div>
        )}

        <div className="px-5 pb-4">
          <button onClick={onClose} className="w-full text-sm text-gray-500 dark:text-gray-400 hover:underline">
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallDialog;
