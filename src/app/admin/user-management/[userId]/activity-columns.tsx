'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { UserActivity } from '@/lib/activity-database';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const columns: ColumnDef<UserActivity>[] = [
  {
    accessorKey: 'activity',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Activity
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const activity = row.original.activity;
      const activityType = activity.type;
      let variant: 'default' | 'secondary' | 'destructive' | 'outline' | null | undefined =
        'secondary';
      if (activityType === 'Authentication') variant = 'default';
      if (activityType === 'AI Action') variant = 'outline';

      return <Badge variant={variant}>{activity.name}</Badge>;
    },
    sortingFn: (rowA, rowB, columnId) => {
        const nameA = rowA.original.activity.name;
        const nameB = rowB.original.activity.name;
        return nameA.localeCompare(nameB);
    }
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
