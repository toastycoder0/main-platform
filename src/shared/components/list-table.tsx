import type * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/table';
import { cn } from '@/shared/utils/cn';

export interface ListColumn {
  key: string;
  label: React.ReactNode;
  className?: string;
}

interface ListTableProps {
  columns: ListColumn[];
  children: React.ReactNode;
  actions?: boolean;
}

export function ListTable({ columns, children, actions = false }: ListTableProps) {
  return (
    <div data-slot='list-table' className='overflow-hidden rounded-md border'>
      <Table>
        <TableHeader className='bg-muted/50'>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn('px-4 text-muted-foreground', column.className)}
              >
                {column.label}
              </TableHead>
            ))}
            {actions ? (
              <TableHead key='actions' className='w-14 px-4 text-right'>
                <span className='sr-only'>Acciones</span>
              </TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}

export function ListCell({ className, ...props }: React.ComponentProps<typeof TableCell>) {
  return <TableCell className={cn('px-4 py-2.5', className)} {...props} />;
}
