import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RingInfo } from '../types';

/**
 * Auswahl der angezeigten Ringe als Aufklappmenü.
 *
 * Bewusst kein Kästchen je Ring nebeneinander: die App soll auf deutlich mehr
 * als 30 Ringe wachsen können. Das Menü hat deshalb ein Suchfeld, eine
 * scrollbare Liste und Sammelaktionen; die Schaltfläche zeigt jederzeit, wie
 * viele Ringe gerade ausgewählt sind.
 */

interface Props {
  rings: RingInfo[];
  selected: Set<number>;
  onChange: (next: Set<number>) => void;
  ownRingId?: number;
  /** Farbe je Ring, damit die Liste zur Karte passt. */
  colorFor?: (ringId: number) => string;
}

const RingFilter: React.FC<Props> = ({ rings, selected, onChange, ownRingId, colorFor }) => {
  const [open, setOpen] = useState(false);
  // Auf schmalen Bildschirmen wird die Liste als Blatt von unten eingeblendet.
  // Ein absolut positioniertes Menü würde von der scrollbaren Filterleiste
  // abgeschnitten und liefe über den rechten Bildschirmrand hinaus.
  const [compact, setCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const onChangeMq = (e: MediaQueryListEvent) => setCompact(e.matches);
    mq.addEventListener('change', onChangeMq);
    return () => mq.removeEventListener('change', onChangeMq);
  }, []);
  const [query, setQuery] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Klick daneben oder Escape schließt das Menü.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (compact) return; // im Blattmodus übernimmt der Hintergrund das Schließen
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, compact]);

  useEffect(() => { if (open) searchRef.current?.focus(); }, [open]);

  const sorted = useMemo(
    () => [...rings].sort((a, b) => {
      // Der eigene Ring steht immer oben.
      if (a.id === ownRingId) return -1;
      if (b.id === ownRingId) return 1;
      return a.name.localeCompare(b.name, 'de');
    }),
    [rings, ownRingId]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(r =>
      r.name.toLowerCase().includes(q) || (r.office_town || '').toLowerCase().includes(q)
    );
  }, [sorted, query]);

  const toggle = (id: number) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange(next);
  };

  const label =
    selected.size === rings.length ? `alle ${rings.length} Ringe`
    : selected.size === 0 ? 'kein Ring'
    : selected.size === 1
      ? (rings.find(r => selected.has(r.id))?.name ?? '1 Ring')
      : `${selected.size} von ${rings.length} Ringen`;

  return (
    <div className="relative inline-block" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="inline-flex items-center gap-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800
                   dark:text-gray-100 rounded px-3 h-9 text-sm max-w-[16rem]"
      >
        <span className="truncate">{label}</span>
        <span aria-hidden="true" className="text-gray-500">{open ? '▲' : '▼'}</span>
      </button>

      {open && compact && (
        <div
          className="fixed inset-0 z-[1190] bg-black/40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className={
            compact
              ? 'fixed z-[1200] left-2 right-2 bottom-2 max-h-[78dvh] flex flex-col rounded-lg border ' +
                'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-2xl'
              : 'absolute z-[1200] mt-1 w-[min(22rem,calc(100vw-2rem))] rounded-md border border-gray-200 ' +
                'dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl'
          }
        >
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <input
              ref={searchRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ring suchen…"
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100
                         rounded px-2 h-9 text-sm"
            />
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs">
              <button type="button" onClick={() => onChange(new Set(rings.map(r => r.id)))}
                      className="text-blue-600 dark:text-blue-400 hover:underline">alle</button>
              <button type="button" onClick={() => onChange(new Set())}
                      className="text-blue-600 dark:text-blue-400 hover:underline">keine</button>
              {ownRingId != null && (
                <button type="button" onClick={() => onChange(new Set([ownRingId]))}
                        className="text-blue-600 dark:text-blue-400 hover:underline">nur eigener Ring</button>
              )}
              {query && (
                <button type="button"
                        onClick={() => onChange(new Set([...selected, ...visible.map(r => r.id)]))}
                        className="text-blue-600 dark:text-blue-400 hover:underline">
                  Treffer hinzufügen
                </button>
              )}
            </div>
          </div>

          <ul className={`overflow-y-auto py-1 ${compact ? 'flex-1 min-h-0' : 'max-h-72'}`}>
            {visible.length === 0 && (
              <li className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">Kein Ring gefunden.</li>
            )}
            {visible.map(r => (
              <li key={r.id}>
                <label
                  role="option"
                  aria-selected={selected.has(r.id)}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/60"
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-mr-green shrink-0"
                    checked={selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                  />
                  {colorFor && (
                    <span aria-hidden="true" className="w-3 h-3 rounded-sm shrink-0"
                          style={{ background: colorFor(r.id) }} />
                  )}
                  <span className={`text-sm min-w-0 ${r.id === ownRingId ? 'font-semibold' : ''}`}>
                    <span className="block truncate">
                      {r.name}
                      {r.website && (
                        <a href={r.website} target="_blank" rel="noopener noreferrer"
                           onClick={e => e.stopPropagation()}
                           title={`Website öffnen: ${r.website.replace(/^https?:\/\//, '')}`}
                           className="ml-1 text-blue-600 dark:text-blue-400 hover:underline">↗</a>
                      )}
                    </span>
                    {r.office_town && (
                      <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                        {r.office_town}{r.id === ownRingId ? ' · eigener Ring' : ''}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {selected.size} von {rings.length} ausgewählt
            </span>
            <button type="button" onClick={() => setOpen(false)}
                    className="text-sm text-mr-green dark:text-mr-light font-medium hover:underline">
              Fertig
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RingFilter;
