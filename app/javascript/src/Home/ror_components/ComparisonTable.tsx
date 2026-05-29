'use client';

// REFERENCE PATTERN: home-comparison-island — see AGENTS.md
// A self-contained TanStack Table client island used on the public landing page.
// It renders the SAME demo dataset that the server-rendered "classic Rails" panel
// renders, but every interaction (filter, sort, paginate) happens instantly in the
// browser with no round trip, and the view state is reflected into the URL without a
// reload. The Rails panel beside it uses a plain GET form, so the contrast between
// "instant client island" and "server round trip" is real, not simulated.

import React, { useEffect, useMemo, useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

// Kept local (not exported): a 'use client' module that exports only its default
// component generates one valid RSC client reference. Exporting a type here would make
// the RSC transform emit an invalid `export const <type>` reference and break the build.
interface DemoProject {
  id: number;
  name: string;
  status: string;
  owner: string;
  lastActivityAt: string;
}

interface ComparisonTableProps {
  projects?: DemoProject[];
  pageSize?: number;
}

// Status names mirror the real Project enum (active/paused/completed/archived).
const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  Paused: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  Completed: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  Archived: 'bg-muted text-muted-foreground',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground',
      )}
    >
      {status}
    </span>
  );
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Format a YYYY-MM-DD string deterministically (no Date/locale/timezone). This
// matches the server-rendered Rails panel's strftime("%b %-d, %Y") exactly and
// avoids both the UTC-vs-local off-by-one and any SSR hydration mismatch.
function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  return `${MONTH_ABBR[month - 1]} ${day}, ${year}`;
}

export default function ComparisonTable({ projects = [], pageSize = 5 }: ComparisonTableProps) {
  // Initial render is deterministic (same on server and client) to keep React on Rails
  // Pro SSR hydration clean. URL-derived state is applied in an effect, client-only.
  const [filter, setFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'lastActivityAt', desc: true }]);
  const [interactions, setInteractions] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize });

  const columns = useMemo<ColumnDef<DemoProject>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Project',
        cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
      },
      {
        accessorKey: 'owner',
        header: 'Owner',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.owner}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'lastActivityAt',
        header: 'Last activity',
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {formatDate(row.original.lastActivityAt)}
          </span>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: projects,
    columns,
    state: { globalFilter: filter, sorting, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    onPaginationChange: setPagination,
    globalFilterFn: (row, _columnId, value) => {
      const needle = String(value).toLowerCase();
      const { name, owner, status } = row.original;
      return (
        name.toLowerCase().includes(needle) ||
        owner.toLowerCase().includes(needle) ||
        status.toLowerCase().includes(needle)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Read shareable view state from the URL once, on the client only.
  useEffect(() => {
    setHydrated(true);
    const params = new URLSearchParams(window.location.search);
    const q = params.get('rq');
    const sort = params.get('rsort');
    const dir = params.get('rdir');
    const page = Number(params.get('rpage'));
    if (q) setFilter(q);
    if (sort) setSorting([{ id: sort, desc: dir !== 'asc' }]);
    if (page > 1) setPagination((prev) => ({ ...prev, pageIndex: page - 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect view state into the URL without a reload (replaceState keeps history clean).
  useEffect(() => {
    if (!hydrated) return;
    const params = new URLSearchParams(window.location.search);
    if (filter) params.set('rq', filter);
    else params.delete('rq');
    const sort = sorting[0];
    if (sort) {
      params.set('rsort', sort.id);
      params.set('rdir', sort.desc ? 'desc' : 'asc');
    } else {
      params.delete('rsort');
      params.delete('rdir');
    }
    if (pagination.pageIndex > 0) params.set('rpage', String(pagination.pageIndex + 1));
    else params.delete('rpage');
    const query = params.toString();
    window.history.replaceState(null, '', query ? `?${query}${window.location.hash}` : window.location.pathname);
  }, [filter, sorting, pagination, hydrated]);

  const rows = table.getRowModel().rows;
  const totalRows = table.getFilteredRowModel().rows.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Input
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value);
            setInteractions((count) => count + 1);
          }}
          placeholder="Filter projects (try a name or status)…"
          aria-label="Filter projects"
          className="h-9"
        />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/40 hover:bg-muted/40">
                {headerGroup.headers.map((header) => {
                  const sortDir = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id} className="h-9">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                        onClick={() => {
                          header.column.toggleSorting();
                          setInteractions((count) => count + 1);
                        }}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sortDir === 'asc' ? (
                          <ArrowUp className="size-3.5" />
                        ) : sortDir === 'desc' ? (
                          <ArrowDown className="size-3.5" />
                        ) : (
                          <ChevronsUpDown className="size-3.5 opacity-40" />
                        )}
                      </button>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No projects match “{filter}”.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Zap className="size-3.5 text-emerald-500" />
          {interactions} interactions, <span className="font-medium text-foreground">0 page reloads</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="tabular-nums">
            Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())} ({totalRows})
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!table.getCanPreviousPage()}
            onClick={() => {
              table.previousPage();
              setInteractions((count) => count + 1);
            }}
          >
            Prev
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!table.getCanNextPage()}
            onClick={() => {
              table.nextPage();
              setInteractions((count) => count + 1);
            }}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
