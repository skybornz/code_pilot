'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { columns } from '../columns';
import { DataTable } from '../data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserForm } from '../user-form';
import type { User } from '@/lib/schemas';
import { getUsers } from '@/actions/users';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function UserManagementPage() {
  const [users, setUsers] = useState<Omit<User, 'password'>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Omit<User, 'password'> | null>(null);
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedUsers = await getUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch user data. Please try again later.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  
  const memoizedColumns = useMemo(() => columns({ onEdit: (user) => {
    setSelectedUser(user);
    setIsFormOpen(true);
  }}), []);

  const onFormSubmit = () => {
    setIsFormOpen(false);
    setSelectedUser(null);
    fetchUsers();
  };

  return (
    <>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-semibold text-primary">User Accounts</CardTitle>
                <Dialog open={isFormOpen} onOpenChange={(open) => {
                    setIsFormOpen(open);
                    if (!open) setSelectedUser(null);
                }}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setSelectedUser(null)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add User
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{selectedUser ? 'Edit User' : 'Add New User'}</DialogTitle>
                        </DialogHeader>
                        <UserForm user={selectedUser} onSubmitSuccess={onFormSubmit} />
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <LoadingSpinner text="Loading users..." />
                    </div>
                ) : (
                    <DataTable columns={memoizedColumns} data={users} />
                )}
            </CardContent>
        </Card>
    </>
  );
}
