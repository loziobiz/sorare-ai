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
  });

  if (data.length === 0 && showEmptyMessage) {
    return (
      <div className="rounded-md border py-12 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table className="table-fixed">
        <TableHeader className="sticky top-0 z-10 bg-white shadow-sm">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow className="hover:bg-muted/50" key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const isSortable = header.column.getCanSort();
                return (
                  <TableHead
                    className={cn(
                      isSortable &&
                        "cursor-pointer select-none hover:bg-muted/80"
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
                onRowClick && !disabled && "cursor-pointer hover:bg-muted/50",
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
