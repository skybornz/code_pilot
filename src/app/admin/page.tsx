'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { User } from '@/lib/schemas';
import { getUsers } from '@/actions/users';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Users, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from '@/components/ui/skeleton';

const chartConfig = {
  count: {
    label: "Count",
  },
  users: {
    label: "Users",
    color: "hsl(var(--chart-1))",
  },
  admins: {
    label: "Admins",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export default function AdminDashboardPage() {
    const [usersData, setUsersData] = useState<Omit<User, 'password'>[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoading(true);
            try {
                const fetchedUsers = await getUsers();
                setUsersData(fetchedUsers);
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
        };
        fetchUsers();
    }, [toast]);

    const stats = useMemo(() => {
        const adminCount = usersData.filter(u => u.role === 'admin').length;
        const userCount = usersData.filter(u => u.role === 'user').length;
        return {
            total: usersData.length,
            admins: adminCount,
            users: userCount,
        };
    }, [usersData]);
    
    const chartData = useMemo(() => [
        { name: 'Users', count: stats.users, fill: "var(--color-users)" },
        { name: 'Admins', count: stats.admins, fill: "var(--color-admins)" }
    ], [stats]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-1/4 mt-1" /> : <div className="text-2xl font-bold">{stats.total}</div>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Admin Accounts</CardTitle>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                         {isLoading ? <Skeleton className="h-8 w-1/4 mt-1" /> : <div className="text-2xl font-bold">{stats.admins}</div>}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Regular Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-1/4 mt-1" /> : <div className="text-2xl font-bold">{stats.users}</div>}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>User Role Distribution</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    {isLoading ? (
                        <div className="h-[300px] w-full flex items-center justify-center">
                            <Skeleton className="h-full w-full" />
                        </div>
                    ) : (
                        <ChartContainer config={chartConfig} className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart accessibilityLayer data={chartData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                                    <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                                    <Tooltip
                                        cursor={false}
                                        content={<ChartTooltipContent indicator="dot" />}
                                    />
                                    <Bar dataKey="count" radius={4} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
