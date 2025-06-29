'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { User } from '@/lib/schemas';
import { MoreHorizontal, Eye, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

type ColumnsProps = {
  onEdit: (user: Omit<User, 'password'>) => void;
};

export const columns = ({ onEdit }: ColumnsProps): ColumnDef<Omit<User, 'password'>>[] => [
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => {
      const role = row.getValue('role') as string;
      return <Badge variant={role === 'admin' ? 'default' : 'secondary'}>{role}</Badge>;
    },
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => {
      const isActive = row.getValue('isActive');
      return (
        <Badge variant={isActive ? 'default' : 'destructive'}>
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'lastActive',
    header: 'Last Active',
    cell: ({ row }) => {
      const lastActive = row.getValue('lastActive') as string;
      if (!lastActive) return <span>-</span>;
      const date = new Date(lastActive);
      return <span>{formatDistanceToNow(date, { addSuffix: true })}</span>;
    },
  },
  {
    id: 'actions',
    cell: function ActionsCell({ row }) {
      const user = row.original;
      const router = useRouter();

      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => router.push(`/admin/user-management/${user.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(user)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
