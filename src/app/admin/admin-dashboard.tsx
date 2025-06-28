'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { columns } from './columns';
import { DataTable } from './data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserForm } from './user-form';
import type { User } from '@/lib/schemas';
import { getUsers } from '@/lib/auth';
import { Loader2, PlusCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export function AdminDashboard() {
  const [users, setUsers] = useState<Omit<User, 'password'>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Omit<User, 'password'> | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    const fetchedUsers = await getUsers();
    setUsers(fetchedUsers);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);
  
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
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/">
                        <ArrowLeft />
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold">Admin Settings</h1>
            </div>
            
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>User Accounts</CardTitle>
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
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                        <DataTable columns={memoizedColumns} data={users} />
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
