'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { UserActivity } from '@/lib/activity-database';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export const columns: ColumnDef<UserActivity>[] = [
  {
    accessorKey: 'action',
    header: 'Action Type',
    cell: ({ row }) => {
        const action = row.getValue('action') as string;
        let variant: "default" | "secondary" | "destructive" | "outline" | null | undefined = 'secondary';
        if (action === 'Login') variant = 'default';
        if (action === 'AI Action') variant = 'outline';

        return <Badge variant={variant}>{action}</Badge>;
    }
  },
  {
    accessorKey: 'details',
    header: 'Details',
  },
  {
    accessorKey: 'timestamp',
    header: 'Date',
    cell: ({ row }) => {
      const timestamp = row.getValue('timestamp') as Date;
      if (!timestamp) return '-';
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    },
  },
];
