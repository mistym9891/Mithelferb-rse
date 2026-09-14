import React from 'react';
import { useTable, Column } from '@tanstack/react-table';
import { AvailableStaff } from '../types';

interface TableViewProps {
  data: AvailableStaff[];
  userRingId: number;
}

const TableView: React.FC<TableViewProps> = ({ data, userRingId }) => {
  const columns = React.useMemo<Column<AvailableStaff>[]>(
    () => [
      { accessorKey: 'abbreviation', header: 'Kürzel' },
      { accessorKey: 'town', header: 'Wohnort' },
      { accessorKey: 'hours_per_day', header: 'Std./Tag' },
      { accessorKey: 'ring_name', header: 'Maschinenring' },
      { accessorKey: 'start_date', header: 'Von' },
      { accessorKey: 'end_date', header: 'Bis' },
      {
        id: 'full_details',
        header: 'Details',
        cell: ({ row }) => {
          const staff = row.original;
          if (staff.ring_id === userRingId) {
            return (
              <span>
                {staff.first_name} {staff.last_name} ({staff.phone}, {staff.email})
              </span>
            );
          }
          return <span>—</span>;
        },
      },
    ],
    [userRingId]
  );

  const table = useTable({ data, columns });
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="px-4 py-2 border-b">
                  {header.column.columnDef.header}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id}>
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-4 py-2 border-b">
                  {cell.renderValue() as React.ReactNode}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableView;