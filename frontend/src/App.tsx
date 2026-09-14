import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './pages/ProtectedRoute';
import ResetRequestPage from './pages/ResetRequest';
import InstallDialog from './components/InstallDialog';
import ConfirmDialog from './components/ConfirmDialog';
import LegalGate from './components/LegalGate';
import PasswordGate from './components/PasswordGate';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider, useTheme } from './hooks/useTheme';

const ThemeButton: React.FC = () => {
  const { choice, resolved, cycle } = useTheme();
  const icon = choice === 'system' ? '🖥️' : resolved === 'dark' ? '🌙' : '☀️';
  const label =
    choice === 'system' ? 'Design: System' : choice === 'dark' ? 'Design: dunkel' : 'Design: hell';
  return (
    <button
      onClick={cycle}
      title={label}
      aria-label={label}
      className="w-9 h-9 grid place-items-center rounded bg-white/20 hover:bg-white/30 text-base leading-none"
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
};

const Header: React.FC<{ onShare: () => void; onLogout: () => void }> = ({ onShare, onLogout }) => {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <header className="bg-mr-green dark:bg-mr-dark text-white px-3 sm:px-4 flex justify-between items-center gap-2 h-[52px] shrink-0">
      {/* Der Anwendungsname bleibt neutral – die App wird von mehreren Ringen
          gemeinsam genutzt. Der eigene Ring steht als Zuordnung beim Benutzer. */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <img src="/icon-192.png" alt="" className="h-8 w-8 object-contain bg-white rounded p-0.5 shrink-0" />
        <div className="min-w-0 leading-tight">
          <div className="font-semibold truncate text-sm sm:text-base">Mithelferbörse</div>
          <div className="text-[11px] text-white/70 truncate hidden sm:block">
            Maschinenringe Sozialdienst
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <div className="hidden md:block text-right leading-tight min-w-0 max-w-[22ch]">
          <div className="text-sm truncate">{user.name || user.email}</div>
          <div className="text-[11px] text-white/70 truncate" title={user.ringName}>
            {user.ringName}
          </div>
        </div>
        <ThemeButton />
        <button
          onClick={onShare}
          title="App installieren, teilen und Benachrichtigungen"
          aria-label="App installieren und teilen"
          className="w-9 h-9 grid place-items-center rounded bg-white/20 hover:bg-white/30 text-base leading-none"
        >
          <span aria-hidden="true">⬇</span>
        </button>
        <button
          onClick={onLogout}
          title="Abmelden"
          className="bg-white/20 hover:bg-white/30 px-2.5 sm:px-3 h-9 rounded text-sm whitespace-nowrap"
        >
          <span className="hidden sm:inline">Abmelden</span>
          <span className="sm:hidden" aria-label="Abmelden">⏻</span>
        </button>
      </div>
    </header>
  );
};

/**
 * Pflichtschritte vor der Nutzung: erst Passwort ändern (falls von der
 * Verwaltung vergeben), dann den Rechtstexten zustimmen.
 */
const Gates: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { user, refreshUser } = useAuth();
  if (!user) return null;

  if (user.mustChangePassword) {
    return <PasswordGate onDone={refreshUser} onLogout={onLogout} />;
  }
  if (user.termsAccepted === false || user.privacyAccepted === false) {
    return <LegalGate onAccepted={refreshUser} onLogout={onLogout} />;
  }
  return null;
};

const Shell: React.FC = () => {
  const { resolved } = useTheme();
  const { user, logout } = useAuth();
  const [showShare, setShowShare] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Header onShare={() => setShowShare(true)} onLogout={() => setConfirmLogout(true)} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/passwort-zuruecksetzen/:token"
          element={<ProtectedRoute><ResetRequestPage /></ProtectedRoute>}
        />
        <Route
          path="/dashboard"
          element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      <Gates onLogout={() => setConfirmLogout(true)} />
      {showShare && <InstallDialog onClose={() => setShowShare(false)} />}

      {confirmLogout && (
        <ConfirmDialog
          title="Wirklich abmelden?"
          message={
            <>
              Sie werden von der Mithelferbörse abgemeldet
              {user?.name ? <> – angemeldet als <strong>{user.name}</strong></> : null}.
              Für die nächste Anmeldung werden E-Mail und Passwort wieder benötigt.
            </>
          }
          confirmLabel="Abmelden"
          cancelLabel="Angemeldet bleiben"
          danger
          onConfirm={() => { setConfirmLogout(false); logout(); }}
          onCancel={() => setConfirmLogout(false)}
        />
      )}

      {/* Pop-Up-Benachrichtigungen für neue freie Mitarbeiter */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        newestOnTop
        theme={resolved}
        className="!z-[1500]"
      />
    </div>
  );
};

const App: React.FC = () => (
  <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
