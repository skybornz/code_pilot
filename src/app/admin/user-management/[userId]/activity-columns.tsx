'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { UserActivity } from '@/lib/activity-database';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const columns: ColumnDef<UserActivity>[] = [
  {
    accessorKey: 'action',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Action Type
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const action = row.getValue('action') as string;
      let variant: 'default' | 'secondary' | 'destructive' | 'outline' | null | undefined =
        'secondary';
      if (action === 'Login') variant = 'default';
      if (action === 'AI Action') variant = 'outline';

      return <Badge variant={variant}>{action}</Badge>;
    },
  },
  {
    accessorKey: 'details',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Details
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: 'timestamp',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const timestamp = row.getValue('timestamp') as Date;
      if (!timestamp) return '-';
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    },
  },
];
