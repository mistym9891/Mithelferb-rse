import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { getRings, getRingList, getAvailableStaff } from '../api';
import MapView from '../components/MapView';
import TableView from '../components/TableView';
import StaffManager from '../components/StaffManager';
import AdminPanel from '../components/AdminPanel';
import RingFilter from '../components/RingFilter';
import { makeRingColorMap } from '../ringColors';
import { AvailableStaff, RingInfo } from '../types';

// Fallback centre: roughly Hohenlohe / Schwäbisch Hall.
const DEFAULT_CENTER: [number, number] = [49.2, 9.9];

type Tab = 'map' | 'table' | 'manage' | 'admin';

/** Kurzform des Ringnamens für die enge Darstellung auf dem Handy. */
const shortRingName = (name: string) =>
  name.replace(/^Maschinen(-\s*und\s*Betriebshilfs)?ring\s*/i, '').replace(/\s*e\.\s*V\.\s*$/i, '');

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('map');
  const [ringFeatures, setRingFeatures] = useState<any[]>([]);
  const [ringList, setRingList] = useState<RingInfo[]>([]);
  const [staff, setStaff] = useState<AvailableStaff[]>([]);
  const [selectedRings, setSelectedRings] = useState<Set<number>>(new Set());
  const [typeFilter, setTypeFilter] = useState<'' | 'agricultural' | 'urban'>('');
  const [whenFilter, setWhenFilter] = useState<'' | 'current' | 'upcoming'>('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const { socket, state: connection } = useSocket(localStorage.getItem('token') || undefined);
  const [openRequests, setOpenRequests] = useState(0);
  const [adminReload, setAdminReload] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const isAdmin = user?.role === 'super_admin' || user?.role === 'ring_admin';

  const refreshStaff = useCallback(async () => {
    try {
      const res = await getAvailableStaff();
      setStaff(res.data);
      setLastUpdate(new Date());
    } catch (err: any) {
      // Netzfehler nicht bei jedem Versuch melden – der nächste Lauf holt es nach.
      if (err.response) toast.error('Freie Mitarbeiter konnten nicht geladen werden');
    }
  }, []);

  // Sicherheitsnetz: auch ohne Echtzeit-Ereignisse aktuell bleiben.
  useAutoRefresh(refreshStaff, 60000);

  useEffect(() => {
    (async () => {
      try {
        const [ringsRes, listRes] = await Promise.all([getRings(), getRingList()]);
        setRingFeatures(ringsRes.data.features || []);
        setRingList(listRes.data);
        setSelectedRings(new Set(listRes.data.map(r => r.id)));
        await refreshStaff();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshStaff]);

  // Pop-Up-Benachrichtigung, sobald irgendwo ein freier Mitarbeiter eingetragen wird.
  useEffect(() => {
    if (!socket) return;
    const onNew = (data: any) => {
      const kind = data.type === 'agricultural' ? 'landw.' : 'städt.';
      toast.info(
        `${data.abbreviation} (${shortRingName(data.ringName)}) ist frei: ` +
        `${new Date(data.start_date).toLocaleDateString('de-DE')} – ` +
        `${new Date(data.end_date).toLocaleDateString('de-DE')} · ${data.hours_per_day} Std./Tag · ${kind}`,
        { autoClose: 8000 }
      );
      refreshStaff();
    };
    const onRemoved = () => refreshStaff();
    const onStaffChanged = () => refreshStaff();
    const onResetRequested = (data: any) => {
      toast.warn(
        `Passwortanfrage von ${data.userName || data.userEmail} (${shortRingName(data.ringName)}) – ` +
        'bitte unter „Verwaltung“ bearbeiten.',
        { autoClose: 12000 }
      );
      setOpenRequests(n => n + 1);
      setAdminReload(n => n + 1);
    };
    // Nach einem Verbindungsabbruch kann etwas verpasst worden sein.
    const onReconnect = () => refreshStaff();

    socket.on('newAvailability', onNew);
    socket.on('availabilityRemoved', onRemoved);
    socket.on('staffChanged', onStaffChanged);
    socket.on('passwordResetRequested', onResetRequested);
    socket.on('refresh', onReconnect);
    socket.on('connect', onReconnect);
    return () => {
      socket.off('newAvailability', onNew);
      socket.off('availabilityRemoved', onRemoved);
      socket.off('staffChanged', onStaffChanged);
      socket.off('passwordResetRequested', onResetRequested);
      socket.off('refresh', onReconnect);
      socket.off('connect', onReconnect);
    };
  }, [socket, refreshStaff]);

  // Karte auf die eigene Geschäftsstelle zentrieren.
  const center = useMemo<[number, number]>(() => {
    const own = ringList.find(r => r.id === user?.ringId);
    if (own?.office_lat != null && own?.office_lng != null) {
      return [own.office_lat, own.office_lng];
    }
    return DEFAULT_CENTER;
  }, [ringList, user?.ringId]);

  const visibleRingNames = useMemo(
    () => new Set(ringList.filter(r => selectedRings.has(r.id)).map(r => r.name)),
    [ringList, selectedRings]
  );

  const filteredStaff = useMemo(
    () => staff.filter(s =>
      selectedRings.has(s.ring_id) &&
      (!typeFilter || s.type === typeFilter) &&
      (!whenFilter || (whenFilter === 'current' ? s.is_current : !s.is_current))
    ),
    [staff, selectedRings, typeFilter, whenFilter]
  );

  // Stabile Farbzuordnung über alle Ringe hinweg (nicht nur die sichtbaren).
  const ringColorFor = useMemo(
    () => makeRingColorMap(ringList.map(r => r.id)),
    [ringList]
  );
  const ringIdByName = useMemo(
    () => new Map(ringList.map(r => [r.name, r.id])),
    [ringList]
  );

  const currentCount = filteredStaff.filter(s => s.is_current).length;
  const upcomingCount = filteredStaff.length - currentCount;

  const filteredFeatures = useMemo(
    () => ringFeatures.filter(f => visibleRingNames.has(f.properties?.name)),
    [ringFeatures, visibleRingNames]
  );

  const visibleOffices = useMemo(
    () => ringList.filter(r => selectedRings.has(r.id)),
    [ringList, selectedRings]
  );

  const activeFilterCount =
    (ringList.length - selectedRings.size) + (typeFilter ? 1 : 0) + (whenFilter ? 1 : 0);

  const toggleRing = (id: number) => {
    setSelectedRings(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const tabButton = (id: Tab, label: string, shortLabel: string) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      aria-current={tab === id ? 'page' : undefined}
      className={`px-2 sm:px-4 h-11 text-sm font-medium border-b-2 transition whitespace-nowrap shrink-0 ${
        tab === id
          ? 'border-mr-green text-mr-green dark:border-mr-light dark:text-mr-light'
          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
      }`}
    >
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{shortLabel}</span>
    </button>
  );

  const selectCls =
    'border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded px-2 h-9 text-sm';

  if (loading) return <p className="p-8 text-gray-500 dark:text-gray-400">Lade Daten…</p>;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Reiter */}
      {/* Die Reiterleiste darf bei schmalen Geräten nicht umbrechen: lieber
          waagerecht scrollen als Schaltflächen zerreißen. Der Zähler am Reiter
          „Verw.“ kann die Zeile sonst über die Bildschirmbreite schieben. */}
      <div className="flex items-center gap-0.5 px-2 sm:px-4 border-b border-gray-200 dark:border-gray-700
                      bg-white dark:bg-gray-800 shrink-0 overflow-x-auto no-scrollbar">
        {tabButton('map', 'Karte', 'Karte')}
        {tabButton('table', `Freie Mitarbeiter (${filteredStaff.length})`, `Frei (${filteredStaff.length})`)}
        {tabButton('manage', 'Meine Mitarbeiter', 'Meine')}
        {isAdmin && tabButton(
          'admin',
          `Verwaltung${openRequests ? ` (${openRequests})` : ''}`,
          `Verw.${openRequests ? ` (${openRequests})` : ''}`
        )}

        <div className="ml-auto flex items-center gap-2 shrink-0 pl-1">
          {/* Zeigt, ob die Anzeige gerade live ist. */}
          <span
            title={
              connection === 'online'
                ? `Live verbunden · zuletzt aktualisiert ${lastUpdate.toLocaleTimeString('de-DE')}`
                : connection === 'connecting'
                ? 'Verbindung wird aufgebaut …'
                : 'Keine Live-Verbindung – es wird regelmäßig neu geladen'
            }
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap"
          >
            <span
              aria-hidden="true"
              className={`inline-block w-2 h-2 rounded-full ${
                connection === 'online' ? 'bg-green-500'
                : connection === 'connecting' ? 'bg-amber-500 animate-pulse'
                : 'bg-red-500'
              }`}
            />
            {connection === 'online' ? 'live' : connection === 'connecting' ? 'verbinde…' : 'offline'}
          </span>

          {(tab === 'map' || tab === 'table') && (
            <button
              onClick={() => setFiltersOpen(o => !o)}
              aria-expanded={filtersOpen}
              className="lg:hidden h-9 px-2.5 rounded text-sm whitespace-nowrap shrink-0
                         border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
            >
              {/* Ohne Pfeilzeichen – auf 320-px-Geräten passte die Zeile sonst
                  nicht und der Pfeil rutschte in eine zweite Zeile. */}
              Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </button>
          )}
        </div>
      </div>

      {/* Filterleiste – auf großen Bildschirmen immer sichtbar, mobil einklappbar */}
      {(tab === 'map' || tab === 'table') && (
        <div
          className={`${filtersOpen ? 'block' : 'hidden'} lg:block px-3 sm:px-4 py-2 bg-gray-50 dark:bg-gray-800/60
                      border-b border-gray-200 dark:border-gray-700 text-sm shrink-0
                      max-h-[45vh] overflow-y-auto lg:max-h-none lg:overflow-visible`}
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="inline-flex items-center gap-1.5">
              <span className="font-medium">Ringe:</span>
              <RingFilter
                rings={ringList}
                selected={selectedRings}
                onChange={setSelectedRings}
                ownRingId={user?.ringId}
                colorFor={id => ringColorFor(id, document.documentElement.classList.contains('dark'))}
              />
            </label>

            <label className="inline-flex items-center gap-1.5">
              <span className="font-medium">Art:</span>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className={selectCls}>
                <option value="">alle</option>
                <option value="agricultural">landwirtschaftlich</option>
                <option value="urban">städtisch</option>
              </select>
            </label>

            <label className="inline-flex items-center gap-1.5">
              <span className="font-medium">Zeitraum:</span>
              <select value={whenFilter} onChange={e => setWhenFilter(e.target.value as any)} className={selectCls}>
                <option value="">jetzt und künftig</option>
                <option value="current">nur jetzt frei</option>
                <option value="upcoming">nur künftig frei</option>
              </select>
            </label>

            <span className="text-xs text-gray-600 dark:text-gray-400">
              {currentCount} jetzt · {upcomingCount} künftig
            </span>

            <span className="w-full lg:w-auto lg:ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full" style={{ background: '#f9a8d4' }} /> weiblich
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full" style={{ background: '#93c5fd' }} /> männlich
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full border-2 border-dashed" style={{ borderColor: '#b45309' }} /> erst künftig frei
              </span>
              <span>L = landw. · S = städt.</span>
            </span>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto bg-gray-50 dark:bg-gray-900">
        {tab === 'map' && (
          <MapView
            rings={filteredFeatures}
            offices={visibleOffices}
            staff={filteredStaff}
            center={center}
            zoom={9}
            colorFor={ringColorFor}
            ringIdByName={ringIdByName}
          />
        )}
        {tab === 'table' && <TableView data={filteredStaff} />}
        {tab === 'manage' && <StaffManager />}
        {tab === 'admin' && isAdmin && user && (
          <AdminPanel
            me={user}
            rings={ringList}
            onOpenRequestsChange={setOpenRequests}
            reloadSignal={adminReload}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
