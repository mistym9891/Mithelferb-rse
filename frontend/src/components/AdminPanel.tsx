import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { AdminUser, ResetRequest, RingInfo, Role, User } from '../types';
import {
  getAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser,
  resetUserPassword, getResetRequests, generateResetPassword,
} from '../api';
import RingManager from './RingManager';

const ROLE_LABEL: Record<Role, string> = {
  super_admin: 'Super-Administration',
  ring_admin: 'Ring-Administration',
  member: 'Einsatzleitung',
};

const ROLE_HINT: Record<Role, string> = {
  super_admin: 'Ringübergreifend: verwaltet alle Ringe, Konten und IT-Belange.',
  ring_admin: 'Verwaltet die Benutzerkonten des eigenen Rings.',
  member: 'Sieht alle freien Kräfte und pflegt die eigenen Mitarbeiter.',
};

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : '—');

/** Zeigt ein neu erzeugtes Passwort genau einmal an. */
const PasswordResult: React.FC<{ name: string; password: string; hint: string; onClose: () => void }> =
({ name, password, hint, onClose }) => (
  <div className="fixed inset-0 z-[2500] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
      <h3 className="font-bold mb-2">Neues Passwort für {name}</h3>
      <div className="bg-gray-100 dark:bg-gray-900 rounded p-3 font-mono text-lg text-center select-all break-all">
        {password}
      </div>
      <p className="text-xs text-amber-700 dark:text-amber-400 mt-3">{hint}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Dieses Passwort wird <strong>nur jetzt</strong> angezeigt und kann später nicht mehr abgerufen werden.
      </p>
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => { navigator.clipboard?.writeText(password); toast.success('Passwort kopiert'); }}
          className="flex-1 border border-gray-300 dark:border-gray-600 rounded h-10 text-sm"
        >
          Kopieren
        </button>
        <button onClick={onClose} className="flex-1 bg-mr-green hover:bg-mr-dark text-white rounded h-10 text-sm font-medium">
          Fertig
        </button>
      </div>
    </div>
  </div>
);

/**
 * Rollenauswahl. Enthält immer eine Option für die aktuelle Rolle – sonst
 * zeigte das Auswahlfeld für einen Ring-Admin bei einem Super-Admin
 * fälschlich die erste Option ("Einsatzleitung") an.
 * Ein Super-Admin darf ausserdem nur von einem Super-Admin geändert werden.
 */
const RoleSelect: React.FC<{
  user: AdminUser;
  meId: number;
  isSuper: boolean;
  onChange: (role: Role) => void;
  className?: string;
}> = ({ user, meId, isSuper, onChange, className }) => {
  const locked = user.id === meId || (user.role === 'super_admin' && !isSuper);

  if (locked) {
    return (
      <span
        className="inline-block text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 whitespace-nowrap"
        title={user.id === meId
          ? 'Die eigene Rolle kann nicht geändert werden'
          : 'Nur die Super-Administration kann diese Rolle ändern'}
      >
        {ROLE_LABEL[user.role]}
      </span>
    );
  }

  return (
    <select
      value={user.role}
      onChange={e => onChange(e.target.value as Role)}
      className={className}
    >
      <option value="member">{ROLE_LABEL.member}</option>
      <option value="ring_admin">{ROLE_LABEL.ring_admin}</option>
      {isSuper && <option value="super_admin">{ROLE_LABEL.super_admin}</option>}
    </select>
  );
};

interface Props {
  me: User;
  rings: RingInfo[];
  /** Zähler für offene Passwortanfragen, damit das Reiter-Abzeichen stimmt. */
  onOpenRequestsChange?: (n: number) => void;
  reloadSignal?: number;
}

const AdminPanel: React.FC<Props> = ({ me, rings, onOpenRequestsChange, reloadSignal }) => {
  const isSuper = me.role === 'super_admin';
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ name: string; password: string; hint: string } | null>(null);
  const [form, setForm] = useState({ email: '', name: '', phone: '', role: 'member' as Role, ringId: me.ringId });

  const load = async () => {
    try {
      const [u, r] = await Promise.all([getAdminUsers(), getResetRequests()]);
      setUsers(u.data);
      setRequests(r.data);
      onOpenRequestsChange?.(r.data.length);
    } catch {
      toast.error('Verwaltungsdaten konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [reloadSignal]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await createAdminUser({
        email: form.email.trim(), name: form.name.trim(), phone: form.phone || undefined,
        role: form.role, ringId: isSuper ? form.ringId : undefined,
      });
      setResult({ name: form.name, password: res.data.initialPassword, hint: res.data.hint });
      setForm({ email: '', name: '', phone: '', role: 'member', ringId: me.ringId });
      setShowForm(false);
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Benutzer konnte nicht angelegt werden');
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (u: AdminUser, role: Role) => {
    try {
      await updateAdminUser(u.id, { role });
      toast.success(`${u.name || u.email}: Rolle geändert`);
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Änderung fehlgeschlagen');
    }
  };

  const toggleActive = async (u: AdminUser) => {
    try {
      await updateAdminUser(u.id, { active: !u.active });
      toast.success(`${u.name || u.email}: ${u.active ? 'gesperrt' : 'freigeschaltet'}`);
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Änderung fehlgeschlagen');
    }
  };

  const resetPw = async (u: AdminUser) => {
    if (!confirm(`Neues Passwort für ${u.name || u.email} erzeugen?`)) return;
    try {
      const res = await resetUserPassword(u.id);
      setResult({ name: res.data.userName || u.email, password: res.data.newPassword, hint: res.data.hint });
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Zurücksetzen fehlgeschlagen');
    }
  };

  const handleRequest = async (r: ResetRequest) => {
    try {
      const res = await generateResetPassword(r.token);
      setResult({ name: res.data.userName || r.user_email, password: res.data.newPassword, hint: res.data.hint });
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Anfrage konnte nicht bearbeitet werden');
    }
  };

  const remove = async (u: AdminUser) => {
    if (!confirm(`Konto von ${u.name || u.email} endgültig löschen?`)) return;
    try {
      await deleteAdminUser(u.id);
      toast.success('Konto gelöscht');
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Löschen fehlgeschlagen');
    }
  };

  const input = 'w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-2 h-10 text-sm';
  const cell = 'px-3 py-2 border-b border-gray-200 dark:border-gray-700';

  if (loading) return <p className="p-6 text-gray-500 dark:text-gray-400">Lade Verwaltung…</p>;

  return (
    <div className="p-3 sm:p-4">
      {result && <PasswordResult {...result} onClose={() => setResult(null)} />}

      {/* Offene Passwortanfragen */}
      {requests.length > 0 && (
        <section className="mb-6 rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3">
          <h3 className="font-bold text-sm mb-2">
            Offene Passwortanfragen ({requests.length})
          </h3>
          <ul className="space-y-2">
            {requests.map(r => (
              <li key={r.token} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  <strong>{r.user_name || r.user_email}</strong>
                  <span className="text-gray-600 dark:text-gray-400"> · {r.ring_name} · angefragt {fmt(r.requested_at)}</span>
                </span>
                <button onClick={() => handleRequest(r)}
                        className="bg-mr-green hover:bg-mr-dark text-white px-3 h-9 rounded text-xs font-medium">
                  Neues Passwort erzeugen
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            Das erzeugte Passwort bitte persönlich übergeben – nicht per E-Mail oder Messenger.
          </p>
        </section>
      )}

      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold">
            Benutzerkonten ({users.length})
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {isSuper ? 'Alle Ringe (Super-Administration)' : `Nur ${me.ringName}`}
          </p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
                className="bg-mr-green hover:bg-mr-dark text-white px-3 sm:px-4 h-10 rounded text-sm font-medium whitespace-nowrap">
          {showForm ? 'Abbrechen' : '+ Konto'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-3 sm:p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name *</span>
            <input className={input} required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Dienstliche E-Mail *</span>
            <input className={input} type="email" inputMode="email" autoCapitalize="none" required
                   value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Telefon</span>
            <input className={input} type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Rolle</span>
            <select className={input} value={form.role} onChange={e => setForm({ ...form, role: e.target.value as Role })}>
              <option value="member">{ROLE_LABEL.member}</option>
              <option value="ring_admin">{ROLE_LABEL.ring_admin}</option>
              {isSuper && <option value="super_admin">{ROLE_LABEL.super_admin}</option>}
            </select>
            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">{ROLE_HINT[form.role]}</span>
          </label>
          {isSuper && (
            <label className="block">
              <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Maschinenring</span>
              <select className={input} value={form.ringId} onChange={e => setForm({ ...form, ringId: parseInt(e.target.value) })}>
                {rings.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label>
          )}
          <div className="sm:col-span-2">
            <button type="submit" disabled={saving}
                    className="w-full sm:w-auto bg-mr-green hover:bg-mr-dark disabled:opacity-50 text-white px-5 h-11 rounded text-sm font-medium">
              {saving ? 'Wird angelegt…' : 'Konto anlegen'}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Es wird ein Startpasswort erzeugt und einmalig angezeigt. Die Person muss es
              bei der ersten Anmeldung ändern.
            </p>
          </div>
        </form>
      )}

      {/* Handy: Kartenliste */}
      <div className="md:hidden space-y-3">
        {users.map(u => (
          <div key={u.id} className={`rounded border p-3 ${u.active
            ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            : 'bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700 opacity-70'}`}>
            {/* Auf schmalen Geräten untereinander: Name und Rollenbezeichnung
                konkurrierten sonst um eine Zeile und wurden beide abgeschnitten. */}
            <div className="flex flex-col xs:flex-row xs:items-baseline xs:justify-between gap-0.5 xs:gap-2">
              <strong className="min-w-0 break-words">{u.name || u.email}</strong>
              <span className="text-xs text-gray-500 dark:text-gray-400 xs:whitespace-nowrap">
                {ROLE_LABEL[u.role]}
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 break-all">{u.email}</div>
            {isSuper && <div className="text-xs text-gray-500 dark:text-gray-400">{u.ring_name}</div>}
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Letzte Anmeldung: {fmt(u.last_login_at)}
              {u.must_change_password && <span className="ml-2 text-amber-700 dark:text-amber-400">Passwortwechsel offen</span>}
              {!u.terms_accepted_at && <span className="ml-2 text-amber-700 dark:text-amber-400">Zustimmung offen</span>}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <RoleSelect user={u} meId={me.id} isSuper={isSuper}
                          onChange={role => changeRole(u, role)}
                          className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded h-8 text-xs px-1" />
              <button onClick={() => resetPw(u)} className="text-white bg-amber-600 hover:bg-amber-700 px-2.5 h-8 rounded text-xs">Passwort</button>
              <button onClick={() => toggleActive(u)} disabled={u.id === me.id || (u.role === 'super_admin' && !isSuper)}
                      className="text-white bg-gray-500 hover:bg-gray-600 disabled:opacity-40 px-2.5 h-8 rounded text-xs">
                {u.active ? 'sperren' : 'freigeben'}
              </button>
              <button onClick={() => remove(u)} disabled={u.id === me.id || (u.role === 'super_admin' && !isSuper)}
                      className="text-red-600 dark:text-red-400 disabled:opacity-40 hover:underline text-xs px-1.5 h-8">löschen</button>
            </div>
          </div>
        ))}
      </div>

      {/* Tablet/Desktop: Tabelle */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full text-sm bg-white dark:bg-gray-800">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              {['Name', 'E-Mail', ...(isSuper ? ['Ring'] : []), 'Rolle', 'Status', 'Letzte Anmeldung', 'Aktionen'].map(h => (
                <th key={h} className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-600 text-left font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className={u.active ? '' : 'opacity-60'}>
                <td className={`${cell} whitespace-nowrap`}>
                  {u.name || '—'}
                  {u.id === me.id && <span className="ml-1 text-xs text-gray-500">(Sie)</span>}
                </td>
                <td className={`${cell} break-all`}>{u.email}</td>
                {isSuper && <td className={cell}>{u.ring_name}</td>}
                <td className={cell}>
                  <RoleSelect user={u} meId={me.id} isSuper={isSuper}
                              onChange={role => changeRole(u, role)}
                              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded h-8 text-xs px-1" />
                </td>
                <td className={`${cell} whitespace-nowrap text-xs`}>
                  {u.active
                    ? <span className="text-green-700 dark:text-green-400">aktiv</span>
                    : <span className="text-gray-500">gesperrt</span>}
                  {u.must_change_password && <div className="text-amber-700 dark:text-amber-400">Passwortwechsel offen</div>}
                  {!u.terms_accepted_at && <div className="text-amber-700 dark:text-amber-400">Zustimmung offen</div>}
                </td>
                <td className={`${cell} whitespace-nowrap text-xs`}>{fmt(u.last_login_at)}</td>
                <td className={`${cell} whitespace-nowrap`}>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => resetPw(u)} className="text-white bg-amber-600 hover:bg-amber-700 px-2.5 h-8 rounded text-xs">Passwort</button>
                    <button onClick={() => toggleActive(u)} disabled={u.id === me.id || (u.role === 'super_admin' && !isSuper)}
                            className="text-white bg-gray-500 hover:bg-gray-600 disabled:opacity-40 px-2.5 h-8 rounded text-xs">
                      {u.active ? 'sperren' : 'freigeben'}
                    </button>
                    <button onClick={() => remove(u)} disabled={u.id === me.id || (u.role === 'super_admin' && !isSuper)}
                            className="text-red-600 dark:text-red-400 disabled:opacity-40 hover:underline text-xs px-1.5 h-8">löschen</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p><strong>{ROLE_LABEL.super_admin}:</strong> {ROLE_HINT.super_admin}</p>
        <p><strong>{ROLE_LABEL.ring_admin}:</strong> {ROLE_HINT.ring_admin}</p>
        <p><strong>{ROLE_LABEL.member}:</strong> {ROLE_HINT.member}</p>
      </div>

      {/* Ringe anlegen und pflegen – ausschließlich Super-Administration. */}
      {isSuper && <RingManager onChanged={load} />}
    </div>
  );
};

export default AdminPanel;
