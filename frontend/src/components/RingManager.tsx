import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { AdminRing } from '../types';
import { getAdminRings, createAdminRing, updateAdminRing, deleteAdminRing } from '../api';
import RingLink from './RingLink';

/**
 * Ringverwaltung – nur für die Super-Administration.
 *
 * Die App ist nicht auf eine feste Zahl von Ringen ausgelegt: hier lassen sich
 * jederzeit weitere anlegen. Farben auf der Karte und im Filter werden
 * automatisch vergeben, die Ringauswahl ist ein durchsuchbares Aufklappmenü –
 * beides funktioniert auch bei deutlich mehr als 30 Ringen.
 */
const RingManager: React.FC<{ onChanged?: () => void }> = ({ onChanged }) => {
  const [rings, setRings] = useState<AdminRing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ name: '', officeTown: '', website: '' });
  const [editing, setEditing] = useState<AdminRing | null>(null);

  const load = async () => {
    try {
      const r = await getAdminRings();
      setRings(r.data);
    } catch {
      toast.error('Ringe konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateAdminRing(editing.id, {
          name: form.name.trim(), officeTown: form.officeTown.trim(), website: form.website.trim(),
        });
        toast.success('Ring aktualisiert');
      } else {
        const res = await createAdminRing({
          name: form.name.trim(),
          officeTown: form.officeTown.trim() || undefined,
          website: form.website.trim() || undefined,
        });
        toast.success(`Ring „${res.data.name}“ angelegt`);
        if (res.data.hint) toast.warn(res.data.hint, { autoClose: 9000 });
      }
      setForm({ name: '', officeTown: '', website: '' });
      setEditing(null);
      setShowForm(false);
      await load();
      onChanged?.();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  const edit = (r: AdminRing) => {
    setForm({ name: r.name, officeTown: r.office_town || '', website: r.website || '' });
    setEditing(r);
    setShowForm(true);
  };

  const remove = async (r: AdminRing) => {
    if (!confirm(`Ring „${r.name}“ löschen?`)) return;
    try {
      await deleteAdminRing(r.id);
      toast.success('Ring gelöscht');
      await load();
      onChanged?.();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Löschen fehlgeschlagen', { autoClose: 9000 });
    }
  };

  const visible = rings.filter(r => {
    const q = query.trim().toLowerCase();
    return !q || r.name.toLowerCase().includes(q) || (r.office_town || '').toLowerCase().includes(q);
  });

  const input = 'w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-2 h-10 text-sm';
  const cell = 'px-3 py-2 border-b border-gray-200 dark:border-gray-700';

  if (loading) return <p className="p-4 text-gray-500 dark:text-gray-400">Lade Ringe…</p>;

  return (
    <section className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold">Maschinenringe ({rings.length})</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Weitere Ringe können jederzeit ergänzt werden – die App ist nicht auf eine feste Anzahl begrenzt.
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm({ name: '', officeTown: '', website: '' }); setShowForm(v => !v); }}
          className="bg-mr-green hover:bg-mr-dark text-white px-3 sm:px-4 h-10 rounded text-sm font-medium whitespace-nowrap"
        >
          {showForm ? 'Abbrechen' : '+ Ring'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-3 sm:p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name des Rings *</span>
            <input className={input} required value={form.name}
                   placeholder="z. B. Maschinenring Musterstadt e. V."
                   onChange={e => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Geschäftsstelle (PLZ Ort)</span>
            <input className={input} value={form.officeTown}
                   placeholder="z. B. 74532 Ilshofen"
                   onChange={e => setForm({ ...form, officeTown: e.target.value })} />
            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
              Wird automatisch in Koordinaten umgerechnet, damit die Karte richtig zentriert.
            </span>
          </label>
          <label className="block sm:col-span-2">
            <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Website</span>
            <input className={input} value={form.website} type="url" inputMode="url" autoCapitalize="none"
                   placeholder="z. B. www.mr-beispiel.de"
                   onChange={e => setForm({ ...form, website: e.target.value })} />
            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
              Der Ringname wird in der App als Link auf diese Adresse angezeigt.
              „https://“ wird bei Bedarf ergänzt.
            </span>
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={saving}
                    className="w-full sm:w-auto bg-mr-green hover:bg-mr-dark disabled:opacity-50 text-white px-5 h-11 rounded text-sm font-medium">
              {saving ? 'Wird gespeichert…' : editing ? 'Änderungen speichern' : 'Ring anlegen'}
            </button>
          </div>
        </form>
      )}

      {rings.length > 8 && (
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Ring suchen…"
          className="mb-3 w-full sm:max-w-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-2 h-9 text-sm"
        />
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm bg-white dark:bg-gray-800">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              {['Ring', 'Website', 'Geschäftsstelle', 'Grenze', 'Gemeinden', 'Konten', 'Mitarbeiter', 'Aktionen'].map(h => (
                <th key={h} className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-600 text-left font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map(r => (
              <tr key={r.id}>
                <td className={cell}><RingLink name={r.name} website={r.website} /></td>
                <td className={`${cell} text-xs whitespace-nowrap`}>
                  {r.website
                    ? <span className="text-gray-600 dark:text-gray-400">{r.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                    : <span className="text-amber-700 dark:text-amber-400">fehlt</span>}
                </td>
                <td className={`${cell} whitespace-nowrap`}>
                  {r.office_town || <span className="text-gray-400">—</span>}
                  {r.office_town && r.office_lat == null &&
                    <span className="ml-1 text-xs text-amber-700 dark:text-amber-400">(nicht verortet)</span>}
                </td>
                <td className={`${cell} text-xs whitespace-nowrap`}>
                  {r.has_boundary
                    ? <span className="text-green-700 dark:text-green-400">
                        {r.boundary_source === 'official' ? 'amtlich' : 'Hülle'}
                      </span>
                    : <span className="text-gray-400">keine</span>}
                </td>
                <td className={cell}>{r.gemeinde_count}</td>
                <td className={cell}>{r.user_count}</td>
                <td className={cell}>{r.staff_count}</td>
                <td className={`${cell} whitespace-nowrap`}>
                  <button onClick={() => edit(r)} className="text-blue-600 dark:text-blue-400 hover:underline text-xs mr-3">bearbeiten</button>
                  <button onClick={() => remove(r)}
                          disabled={Number(r.user_count) > 0 || Number(r.staff_count) > 0}
                          title={Number(r.user_count) > 0 || Number(r.staff_count) > 0
                            ? 'Erst Konten und Mitarbeiter entfernen'
                            : undefined}
                          className="text-red-600 dark:text-red-400 disabled:opacity-40 disabled:no-underline hover:underline text-xs">
                    löschen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
        Nach dem Anlegen weiterer Ringe entstehen deren Grenzen mit
        <code className="mx-1 px-1 bg-gray-100 dark:bg-gray-700 rounded">ALL_RINGS=1 npm run geocode</code>
        und <code className="mx-1 px-1 bg-gray-100 dark:bg-gray-700 rounded">npm run boundaries</code>.
      </p>
    </section>
  );
};

export default RingManager;
