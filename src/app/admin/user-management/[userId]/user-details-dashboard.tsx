'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, User, Wand2, Star, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getUserById } from '@/actions/users';
import { getUserActivity } from '@/actions/activity';
import type { User } from '@/lib/schemas';
import type { UserActivity } from '@/lib/activity-database';
import Link from 'next/link';
import { columns } from './activity-columns';
import { DataTable } from '../../data-table';
import { Badge } from '@/components/ui/badge';
import { TimeAgo } from '@/components/ui/time-ago';

export function UserDetailsDashboard({ userId }: { userId: string }) {
  const [user, setUser] = useState<Omit<User, 'password'> | null>(null);
  const [activity, setActivity] = useState<UserActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchUserData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedUser, fetchedActivity] = await Promise.all([
        getUserById(userId),
        getUserActivity(userId),
      ]);

      if (fetchedUser) {
        setUser(fetchedUser);
        setActivity(fetchedActivity);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not find user data.',
        });
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch user data. Please try again later.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const stats = useMemo(() => {
    const aiActions = activity.filter(a => a.activity.type === 'AI Action').length;
    
    const mostUsed = activity
        .filter(a => a.activity.type === 'AI Action')
        .reduce((acc, a) => {
            const feature = a.activity.name;
            acc[feature] = (acc[feature] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

    const favoriteFeature = Object.keys(mostUsed).sort((a,b) => mostUsed[b] - mostUsed[a])[0] || 'N/A';
    
    return {
        totalAiActions: aiActions,
        favoriteFeature: favoriteFeature,
    };
  }, [activity]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center text-muted-foreground">
        <p>User not found.</p>
        <Button variant="link" asChild>
            <Link href="/admin/user-management">Go back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/admin/user-management" aria-label="Back to users">
                    <ChevronLeft />
                </Link>
            </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
            <CardHeader>
                <CardTitle className="text-xl font-semibold text-primary flex items-center gap-2">
                    <User />
                    User Profile
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium">{user.email}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Role</span>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role}</Badge>
                </div>
                 <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={user.isActive ? 'default' : 'destructive'} className="flex items-center gap-1.5">
                        {user.isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Last Active</span>
                    <span className="font-medium">{user.lastActive ? <TimeAgo date={user.lastActive} /> : '-'}</span>
                </div>
            </CardContent>
        </Card>
        <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle className="text-xl font-semibold text-primary">User Statistics</CardTitle>
            </CardHeader>
             <CardContent className="grid gap-6 sm:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total AI Actions</CardTitle>
                        <Wand2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">{stats.totalAiActions}</div>
                        <p className="text-xs text-muted-foreground">in the last 7 days</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Favorite Feature</CardTitle>
                        <Star className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">{stats.favoriteFeature}</div>
                        <p className="text-xs text-muted-foreground">Most used AI feature</p>
                    </CardContent>
                </Card>
            </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle className="text-xl font-semibold text-primary">Activity History</CardTitle>
            <CardDescription>A log of the user's recent actions within the application.</CardDescription>
        </CardHeader>
        <CardContent>
            <DataTable columns={columns} data={activity} />
        </CardContent>
      </Card>
    </div>
  );
}
