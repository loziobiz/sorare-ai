"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type OnChangeFn,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
  disabled?: boolean;
  showEmptyMessage?: boolean;
  emptyMessage?: string;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  enableSorting?: boolean;
}

export function getSortIcon(
  isSorted: false | "asc" | "desc",
  className?: string
) {
  if (isSorted === false) {
    return (
      <ArrowUpDown className={cn("ml-1 inline-block h-4 w-4", className)} />
    );
  }
  return isSorted === "asc" ? (
    <ArrowUp className={cn("ml-1 inline-block h-4 w-4", className)} />
  ) : (
    <ArrowDown className={cn("ml-1 inline-block h-4 w-4", className)} />
  );
}

export function DataTable<TData>({
  columns,
  data,
  onRowClick,
  disabled = false,
  showEmptyMessage = true,
  emptyMessage = "No data found",
  sorting: externalSorting,
  onSortingChange: externalOnSortingChange,
  enableSorting = true,
}: DataTableProps<TData>) {
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);

  const sorting = externalSorting ?? internalSorting;
  const setSorting = externalOnSortingChange ?? setInternalSorting;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    enableSorting,
    enableSortingRemoval: false,
  });

  if (data.length === 0 && showEmptyMessage) {
    return (
      <div className="rounded-md border py-12 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#1A1B23]">
      <Table className="table-fixed">
        <TableHeader className="sticky top-0 z-10 border-white/5 border-b bg-[#1A1B23]">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              className="border-white/5 hover:bg-white/5"
              key={headerGroup.id}
            >
              {headerGroup.headers.map((header) => {
                const isSortable = header.column.getCanSort();
                return (
                  <TableHead
                    className={cn(
                      "font-semibold text-slate-400 text-xs uppercase tracking-wider",
                      isSortable &&
                        "cursor-pointer select-none hover:bg-white/5 hover:text-slate-300"
                    )}
                    key={header.id}
                    onClick={
                      isSortable
                        ? header.column.getToggleSortingHandler()
                        : undefined
                    }
                    style={{ width: header.getSize() }}
                  >
                    <div className="flex items-center">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {isSortable && getSortIcon(header.column.getIsSorted())}
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              className={cn(
                "border-white/5 transition-colors",
                onRowClick && !disabled && "cursor-pointer hover:bg-white/5",
                disabled && "cursor-not-allowed opacity-50"
              )}
              key={row.id}
              onClick={() => {
                if (onRowClick && !disabled) {
                  onRowClick(row.original);
                }
              }}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  className="py-3 text-slate-200 text-sm"
                  key={cell.id}
                  style={{ width: cell.column.getSize() }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
