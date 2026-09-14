import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table';
import { AvailableStaff } from '../types';
import RingLink from './RingLink';

const columnHelper = createColumnHelper<AvailableStaff>();

const fmt = (d: string) => (d ? new Date(d).toLocaleDateString('de-DE') : '');

/** Tage bis zum Beginn eines noch nicht laufenden Zeitraums. */
const daysUntil = (d: string) =>
  Math.ceil((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);

const StatusBadge: React.FC<{ s: AvailableStaff }> = ({ s }) => {
  if (s.is_current) {
    return (
      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 whitespace-nowrap">
        jetzt frei
      </span>
    );
  }
  const d = daysUntil(s.start_date);
  return (
    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 whitespace-nowrap">
      ab {fmt(s.start_date)}{d > 0 ? ` (in ${d} T.)` : ''}
    </span>
  );
};

const TypeBadge: React.FC<{ s: AvailableStaff }> = ({ s }) => {
  const agri = s.type === 'agricultural';
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${
      agri
        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
        : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
    }`}>
      {agri ? 'landw.' : 'städt.'}
    </span>
  );
};

const abbrevColor = (s: AvailableStaff) =>
  s.type === 'agricultural' ? 'text-blue-700 dark:text-blue-400' : 'text-red-600 dark:text-red-400';

interface TableViewProps {
  data: AvailableStaff[];
}

/**
 * Übersicht aller freien Mitarbeiter. Für fremde Ringe werden nur Kürzel,
 * Wohnort, Std./Tag, Maschinenring, Einsatzleitung, Telefon, Email und der
 * freie Zeitraum angezeigt – der Name bleibt verborgen.
 *
 * Darstellung:
 *  - Handy (< 1024 px): Kartenliste. Die Tabelle hat elf Spalten und wäre auf
 *    einem Telefon rund 1500 px breit – man sähe nur die ersten drei und müsste
 *    für Telefonnummer und Einsatzleitung quer scrollen. Genau die werden aber
 *    gebraucht, um jemanden anzufragen.
 *  - Ab 1024 px: die vollständige, sortierbare Tabelle.
 */
const TableView: React.FC<TableViewProps> = ({ data }) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const columns = React.useMemo(
    () => [
      columnHelper.accessor('start_date', { header: 'Frei von', cell: i => fmt(i.getValue()) }),
      columnHelper.accessor('end_date', { header: 'Frei bis', cell: i => fmt(i.getValue()) }),
      columnHelper.accessor('is_current', {
        header: 'Status',
        cell: i => <StatusBadge s={i.row.original} />,
      }),
      columnHelper.accessor('abbreviation', {
        header: 'Kürzel',
        cell: i => <span className={`font-bold ${abbrevColor(i.row.original)}`}>{i.getValue()}</span>,
      }),
      columnHelper.display({
        id: 'name',
        header: 'Name',
        cell: ({ row }) => {
          const s = row.original;
          return s.is_own_ring && s.first_name
            ? <span>{s.first_name} {s.last_name}</span>
            : <span className="text-gray-400 dark:text-gray-500">—</span>;
        },
      }),
      columnHelper.accessor('town', { header: 'Wohnort' }),
      columnHelper.accessor('type', { header: 'Art', cell: i => <TypeBadge s={i.row.original} /> }),
      columnHelper.accessor('hours_per_day', {
        header: 'Std./Tag',
        cell: i => <span className={`font-bold ${abbrevColor(i.row.original)}`}>{i.getValue()}</span>,
      }),
      columnHelper.accessor('ring_name', {
        header: 'Maschinenring',
        cell: i => <RingLink name={i.getValue()} website={i.row.original.ring_website} />,
      }),
      columnHelper.accessor('supervisor', { header: 'Einsatzleitung', cell: i => i.getValue() || '—' }),
      columnHelper.accessor('phone', {
        header: 'Telefon',
        cell: i => {
          const v = i.getValue();
          return v ? <a className="text-blue-600 dark:text-blue-400 underline" href={`tel:${v.replace(/\s/g, '')}`}>{v}</a> : '—';
        },
      }),
      columnHelper.accessor('email', {
        header: 'E-Mail',
        cell: i => {
          const v = i.getValue();
          return v ? <a className="text-blue-600 dark:text-blue-400 underline" href={`mailto:${v}`}>{v}</a> : '—';
        },
      }),
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (data.length === 0) {
    return (
      <p className="p-6 text-center text-gray-500 dark:text-gray-400">
        Für die aktuelle Auswahl sind keine Mitarbeiter als frei eingetragen.
      </p>
    );
  }

  return (
    <>
      {/* Handy und kleines Tablet: Kartenliste */}
      <div className="lg:hidden p-3 space-y-3">
        {table.getRowModel().rows.map(row => {
          const s = row.original;
          return (
            <article
              key={row.id}
              className={`rounded-lg border p-3 ${
                s.is_own_ring
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              } ${s.is_current ? '' : 'opacity-90'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className={`font-bold text-base ${abbrevColor(s)}`}>{s.abbreviation}</span>
                  {s.is_own_ring && s.first_name && (
                    <span className="ml-2 break-words">{s.first_name} {s.last_name}</span>
                  )}
                </div>
                <StatusBadge s={s} />
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-700 dark:text-gray-300">
                <span>{s.town}</span>
                <span aria-hidden="true" className="text-gray-300 dark:text-gray-600">·</span>
                <TypeBadge s={s} />
                <span aria-hidden="true" className="text-gray-300 dark:text-gray-600">·</span>
                <span className={`font-bold ${abbrevColor(s)}`}>{s.hours_per_day} Std./Tag</span>
              </div>

              <div className="mt-1.5 text-sm break-words">
                <RingLink name={s.ring_name} website={s.ring_website} />
              </div>

              <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                frei {fmt(s.start_date)} – {fmt(s.end_date)}
              </div>

              {/* Kontaktaufnahme ist der eigentliche Zweck: direkt anrufbar. */}
              {(s.supervisor || s.phone || s.email) && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  {s.supervisor && (
                    <div className="text-sm text-gray-700 dark:text-gray-300 break-words">
                      Einsatzleitung: {s.supervisor}
                    </div>
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {s.phone && (
                      <a href={`tel:${s.phone.replace(/\s/g, '')}`}
                         className="inline-flex items-center gap-1.5 bg-mr-green hover:bg-mr-dark text-white
                                    rounded px-3 h-9 text-sm font-medium">
                        <span aria-hidden="true">📞</span> {s.phone}
                      </a>
                    )}
                    {s.email && (
                      <a href={`mailto:${s.email}`}
                         className="inline-flex items-center gap-1.5 border border-gray-300 dark:border-gray-600
                                    text-gray-700 dark:text-gray-200 rounded px-3 h-9 text-sm">
                        <span aria-hidden="true">✉</span> E-Mail
                      </a>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Ab 1024 px: vollständige Tabelle */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full text-sm bg-white dark:bg-gray-800">
          <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0 z-10">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-600 text-left font-semibold cursor-pointer select-none whitespace-nowrap"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: ' ▲', desc: ' ▼' }[header.column.getIsSorted() as string] ?? ''}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr
                key={row.id}
                className={
                  (row.original.is_own_ring ? 'bg-green-50 dark:bg-green-900/25 ' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 ') +
                  (row.original.is_current ? '' : 'opacity-70')
                }
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default TableView;
