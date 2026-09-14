import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Staff } from '../types';
import {
  getMyStaff, createStaff, updateStaff, deleteStaff,
  setAvailability, removeAvailability,
} from '../api';

const EMPTY: Partial<Staff> = {
  first_name: '', last_name: '', abbreviation: '', town: '',
  type: 'agricultural', gender: 'unknown', hours_per_day: 8,
  supervisor: '', phone: '', email: '',
};

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('de-DE') : '');

/**
 * Value for <input type="date">. The API returns a DATE as an ISO timestamp at
 * local midnight, so toISOString() would shift it back a day in any timezone
 * east of UTC – build the string from the local date parts instead.
 */
const toInput = (d?: string) => {
  if (!d) return '';
  const dt = new Date(d);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
};

const input =
  'w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-2 h-10 text-sm';
const dateInput =
  'border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-2 h-9 text-sm w-full';

/** Verwaltung der eigenen Betriebshelfer/innen inkl. Eintragen freier Zeiträume. */
const StaffManager: React.FC = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<Staff>>(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avail, setAvail] = useState<Record<number, { start: string; end: string }>>({});

  const load = async () => {
    try {
      const res = await getMyStaff();
      setStaff(res.data);
      const next: Record<number, { start: string; end: string }> = {};
      for (const s of res.data) {
        next[s.id] = { start: toInput(s.start_date), end: toInput(s.end_date) };
      }
      setAvail(next);
    } catch {
      toast.error('Mitarbeiter konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await updateStaff(editingId, form);
        toast.success('Mitarbeiter aktualisiert');
      } else {
        await createStaff(form);
        toast.success('Mitarbeiter angelegt');
      }
      setForm(EMPTY); setEditingId(null); setShowForm(false);
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  const edit = (s: Staff) => {
    setForm({
      first_name: s.first_name, last_name: s.last_name, abbreviation: s.abbreviation,
      town: s.town, type: s.type, gender: s.gender, hours_per_day: s.hours_per_day,
      supervisor: s.supervisor ?? '', phone: s.phone ?? '', email: s.email ?? '',
    });
    setEditingId(s.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (s: Staff) => {
    if (!confirm(`${s.first_name} ${s.last_name} wirklich löschen?`)) return;
    try {
      await deleteStaff(s.id);
      toast.success('Mitarbeiter gelöscht');
      await load();
    } catch {
      toast.error('Löschen fehlgeschlagen');
    }
  };

  const saveAvailability = async (s: Staff) => {
    const a = avail[s.id];
    if (!a?.start || !a?.end) {
      toast.warn('Startdatum und Enddatum sind Pflichtfelder');
      return;
    }
    if (new Date(a.start) > new Date(a.end)) {
      toast.warn('Das Enddatum muss nach dem Startdatum liegen');
      return;
    }
    try {
      await setAvailability(s.id, a.start, a.end);
      toast.success(`${s.abbreviation} als frei eingetragen`);
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Eintragen fehlgeschlagen');
    }
  };

  const clearAvailability = async (s: Staff) => {
    try {
      await removeAvailability(s.id);
      toast.info(`${s.abbreviation} ist nicht mehr als frei markiert`);
      await load();
    } catch {
      toast.error('Entfernen fehlgeschlagen');
    }
  };

  const field = (label: string, node: React.ReactNode) => (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</span>
      {node}
    </label>
  );

  const abbrevColor = (s: Staff) =>
    s.type === 'agricultural' ? 'text-blue-700 dark:text-blue-400' : 'text-red-600 dark:text-red-400';

  const statusNode = (s: Staff) => {
    if (!s.availability_id) return <span className="text-gray-400 dark:text-gray-500">im Einsatz</span>;
    const upcoming = s.start_date && new Date(s.start_date) > new Date(new Date().setHours(0, 0, 0, 0));
    return (
      <span className={`font-semibold whitespace-nowrap ${upcoming ? 'text-amber-700 dark:text-amber-400' : 'text-green-700 dark:text-green-400'}`}>
        {upcoming ? 'ab' : 'frei'} {fmtDate(s.start_date)}–{fmtDate(s.end_date)}
      </span>
    );
  };

  const dateFields = (s: Staff) => {
    const a = avail[s.id] || { start: '', end: '' };
    return (
      <>
        <input
          type="date" className={dateInput} aria-label={`Frei von für ${s.abbreviation}`}
          value={a.start}
          onChange={e => setAvail({ ...avail, [s.id]: { ...a, start: e.target.value } })}
        />
        <input
          type="date" className={dateInput} aria-label={`Frei bis für ${s.abbreviation}`}
          value={a.end}
          onChange={e => setAvail({ ...avail, [s.id]: { ...a, end: e.target.value } })}
        />
      </>
    );
  };

  const actions = (s: Staff) => (
    <>
      <button onClick={() => saveAvailability(s)} className="text-white bg-green-600 hover:bg-green-700 px-2.5 h-8 rounded text-xs font-medium">
        frei melden
      </button>
      {s.availability_id && (
        <button onClick={() => clearAvailability(s)} className="text-white bg-gray-500 hover:bg-gray-600 px-2.5 h-8 rounded text-xs">
          zurücknehmen
        </button>
      )}
      <button onClick={() => edit(s)} className="text-blue-600 dark:text-blue-400 hover:underline text-xs px-1.5 h-8">
        bearbeiten
      </button>
      <button onClick={() => remove(s)} className="text-red-600 dark:text-red-400 hover:underline text-xs px-1.5 h-8">
        löschen
      </button>
    </>
  );

  if (loading) return <p className="p-6 text-gray-500 dark:text-gray-400">Lade Mitarbeiter…</p>;

  return (
    <div className="p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-base sm:text-lg font-bold">Eigene Mitarbeiter/innen ({staff.length})</h2>
        <button
          onClick={() => { setForm(EMPTY); setEditingId(null); setShowForm(v => !v); }}
          className="bg-mr-green hover:bg-mr-dark text-white px-3 sm:px-4 h-10 rounded text-sm font-medium whitespace-nowrap"
        >
          {showForm ? 'Abbrechen' : '+ Neu'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={submit}
          className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-3 sm:p-4 mb-6
                     grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          {field('Vorname *', <input className={input} required value={form.first_name ?? ''} onChange={e => setForm({ ...form, first_name: e.target.value })} />)}
          {field('Name *', <input className={input} required value={form.last_name ?? ''} onChange={e => setForm({ ...form, last_name: e.target.value })} />)}
          {field('Kürzel *', <input className={input} required maxLength={6} value={form.abbreviation ?? ''} onChange={e => setForm({ ...form, abbreviation: e.target.value })} />)}
          {field('Wohnort *', <input className={input} required value={form.town ?? ''} onChange={e => setForm({ ...form, town: e.target.value })} />)}
          {field('Geschlecht', (
            <select className={input} value={form.gender ?? 'unknown'} onChange={e => setForm({ ...form, gender: e.target.value as Staff['gender'] })}>
              <option value="female">weiblich</option>
              <option value="male">männlich</option>
              <option value="unknown">keine Angabe</option>
            </select>
          ))}
          {field('Einsatzart *', (
            <select className={input} value={form.type ?? 'agricultural'} onChange={e => setForm({ ...form, type: e.target.value as Staff['type'] })}>
              <option value="agricultural">landwirtschaftlich (L)</option>
              <option value="urban">städtisch (S)</option>
            </select>
          ))}
          {field('Std./Tag', <input className={input} type="number" inputMode="decimal" step="0.5" min="0" max="24" value={form.hours_per_day ?? 8} onChange={e => setForm({ ...form, hours_per_day: parseFloat(e.target.value) })} />)}
          {field('Einsatzleitung', <input className={input} value={form.supervisor ?? ''} onChange={e => setForm({ ...form, supervisor: e.target.value })} />)}
          {field('Telefon Einsatzleitung', <input className={input} type="tel" inputMode="tel" value={form.phone ?? ''} onChange={e => setForm({ ...form, phone: e.target.value })} />)}
          {field('E-Mail Einsatzleitung', <input className={input} type="email" inputMode="email" autoCapitalize="none" value={form.email ?? ''} onChange={e => setForm({ ...form, email: e.target.value })} />)}
          <div className="sm:col-span-2 lg:col-span-3">
            <button type="submit" disabled={saving} className="w-full sm:w-auto bg-mr-green hover:bg-mr-dark disabled:opacity-50 text-white px-5 h-11 rounded text-sm font-medium">
              {saving ? 'Speichert…' : editingId ? 'Änderungen speichern' : 'Anlegen'}
            </button>
          </div>
        </form>
      )}

      {/* Handy: Kartenliste – die Tabelle wäre auf 375 px unbrauchbar breit. */}
      <div className="md:hidden space-y-3">
        {staff.map(s => (
          <div
            key={s.id}
            className={`rounded border p-3 ${s.availability_id
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <div className="min-w-0">
                <span className={`font-bold ${abbrevColor(s)}`}>{s.abbreviation}</span>
                <span className="ml-2">{s.first_name} {s.last_name}</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {s.type === 'agricultural' ? 'landw.' : 'städt.'} · {s.hours_per_day} Std.
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{s.town}</div>
            <div className="text-sm mt-1">{statusNode(s)}</div>
            <div className="grid grid-cols-2 gap-2 mt-2">{dateFields(s)}</div>
            <div className="flex flex-wrap items-center gap-2 mt-2">{actions(s)}</div>
          </div>
        ))}
      </div>

      {/* Tablet/Desktop: Tabelle */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full text-sm bg-white dark:bg-gray-800">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              {['Kürzel', 'Name', 'Wohnort', 'Art', 'Std./Tag', 'Frei von *', 'Frei bis *', 'Status', 'Aktionen'].map(h => (
                <th key={h} className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-600 text-left font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staff.map(s => {
              const cell = 'px-3 py-2 border-b border-gray-200 dark:border-gray-700';
              return (
                <tr key={s.id} className={s.availability_id ? 'bg-green-50 dark:bg-green-900/25' : ''}>
                  <td className={`${cell} font-bold ${abbrevColor(s)}`}>{s.abbreviation}</td>
                  <td className={`${cell} whitespace-nowrap`}>{s.first_name} {s.last_name}</td>
                  <td className={cell}>{s.town}</td>
                  <td className={cell}>{s.type === 'agricultural' ? 'landw.' : 'städt.'}</td>
                  <td className={cell}>{s.hours_per_day}</td>
                  <td className={`${cell} w-36`}>
                    <input
                      type="date" className={dateInput} aria-label={`Frei von für ${s.abbreviation}`}
                      value={(avail[s.id] || { start: '' }).start}
                      onChange={e => setAvail({ ...avail, [s.id]: { ...(avail[s.id] || { start: '', end: '' }), start: e.target.value } })}
                    />
                  </td>
                  <td className={`${cell} w-36`}>
                    <input
                      type="date" className={dateInput} aria-label={`Frei bis für ${s.abbreviation}`}
                      value={(avail[s.id] || { end: '' }).end}
                      onChange={e => setAvail({ ...avail, [s.id]: { ...(avail[s.id] || { start: '', end: '' }), end: e.target.value } })}
                    />
                  </td>
                  <td className={cell}>{statusNode(s)}</td>
                  <td className={`${cell} whitespace-nowrap`}>
                    <div className="flex items-center gap-1.5">{actions(s)}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {staff.length === 0 && (
        <p className="p-6 text-center text-gray-500 dark:text-gray-400">Noch keine Mitarbeiter angelegt.</p>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
        * Start- und Enddatum sind beim Freimelden Pflichtfelder. Liegt das Startdatum in der
        Zukunft, erscheint der/die Mitarbeiter/in als „künftig frei“.
      </p>
    </div>
  );
};

export default StaffManager;
