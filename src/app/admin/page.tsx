'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { User } from '@/lib/schemas';
import { getUsers } from '@/actions/users';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Users, Wand2, FileScan } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const dailyActiveUsersChartConfig = {
  users: {
    label: "Active Users",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const usageChartConfig = {
  actions: {
    label: "AI Actions",
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
        return {
            total: usersData.length,
            aiActions: 124,
            filesAnalyzed: 42,
        };
    }, [usersData]);
    
    const dailyActiveUsersData = useMemo(() => [
        { date: 'Mon', users: 22 },
        { date: 'Tue', users: 25 },
        { date: 'Wed', users: 28 },
        { date: 'Thu', users: 24 },
        { date: 'Fri', users: 30 },
        { date: 'Sat', users: 32 },
        { date: 'Sun', users: Math.min(35, stats.total) },
    ], [stats.total]);

    const dailyUsageData = useMemo(() => [
        { date: 'Mon', actions: 86 },
        { date: 'Tue', actions: 92 },
        { date: 'Wed', actions: 105 },
        { date: 'Thu', actions: 80 },
        { date: 'Fri', actions: 110 },
        { date: 'Sat', actions: 130 },
        { date: 'Sun', actions: stats.aiActions },
    ], [stats.aiActions]);
    
    const weeklyData = useMemo(() => [
        { name: 'Week 1', users: 150, actions: 650 },
        { name: 'Week 2', users: 160, actions: 700 },
        { name: 'Week 3', users: 155, actions: 680 },
        { name: 'Week 4', users: 170, actions: 720 },
    ], []);
    
    const monthlyData = useMemo(() => [
        { name: 'Jan', users: 600, actions: 2500 },
        { name: 'Feb', users: 620, actions: 2600 },
        { name: 'Mar', users: 650, actions: 2700 },
        { name: 'Apr', users: 680, actions: 2800 },
        { name: 'May', users: 700, actions: 2900 },
        { name: 'Jun', users: 710, actions: 3000 },
    ], []);

    return (
        <div className="space-y-6">
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
                        <CardTitle className="text-sm font-medium">AI Actions (Today)</CardTitle>
                        <Wand2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                         {isLoading ? <Skeleton className="h-8 w-1/4 mt-1" /> : <div className="text-2xl font-bold">{stats.aiActions}</div>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Files Analyzed</CardTitle>
                        <FileScan className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-1/4 mt-1" /> : <div className="text-2xl font-bold">{stats.filesAnalyzed}</div>}
                    </CardContent>
                </Card>
            </div>
            
            <Tabs defaultValue="daily" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="daily">Daily</TabsTrigger>
                    <TabsTrigger value="weekly">Weekly</TabsTrigger>
                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                </TabsList>
                <TabsContent value="daily" className="space-y-4">
                    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Daily Active Users</CardTitle>
                            </CardHeader>
                            <CardContent className="pl-2">
                                {isLoading ? (
                                    <Skeleton className="h-[300px] w-full" />
                                ) : (
                                    <ChartContainer config={dailyActiveUsersChartConfig} className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart accessibilityLayer data={dailyActiveUsersData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                                                <CartesianGrid vertical={false} />
                                                <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                                                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                                                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                                                <Bar dataKey="users" fill="var(--color-users)" radius={4} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Daily AI Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="pl-2">
                                {isLoading ? (
                                    <Skeleton className="h-[300px] w-full" />
                                ) : (
                                    <ChartContainer config={usageChartConfig} className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart accessibilityLayer data={dailyUsageData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                                                <CartesianGrid vertical={false} />
                                                <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                                                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                                                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                                                <Bar dataKey="actions" fill="var(--color-actions)" radius={4} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
                <TabsContent value="weekly" className="space-y-4">
                     <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Weekly Active Users</CardTitle>
                            </CardHeader>
                            <CardContent className="pl-2">
                                {isLoading ? (
                                    <Skeleton className="h-[300px] w-full" />
                                ) : (
                                    <ChartContainer config={dailyActiveUsersChartConfig} className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart accessibilityLayer data={weeklyData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                                                <CartesianGrid vertical={false} />
                                                <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                                                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                                                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                                                <Bar dataKey="users" fill="var(--color-users)" radius={4} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Weekly AI Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="pl-2">
                                {isLoading ? (
                                    <Skeleton className="h-[300px] w-full" />
                                ) : (
                                    <ChartContainer config={usageChartConfig} className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart accessibilityLayer data={weeklyData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                                                <CartesianGrid vertical={false} />
                                                <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                                                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                                                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                                                <Bar dataKey="actions" fill="var(--color-actions)" radius={4} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
                <TabsContent value="monthly" className="space-y-4">
                     <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Monthly Active Users</CardTitle>
                            </CardHeader>
                            <CardContent className="pl-2">
                                {isLoading ? (
                                    <Skeleton className="h-[300px] w-full" />
                                ) : (
                                    <ChartContainer config={dailyActiveUsersChartConfig} className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart accessibilityLayer data={monthlyData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                                                <CartesianGrid vertical={false} />
                                                <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                                                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                                                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                                                <Bar dataKey="users" fill="var(--color-users)" radius={4} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Monthly AI Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="pl-2">
                                {isLoading ? (
                                    <Skeleton className="h-[300px] w-full" />
                                ) : (
                                    <ChartContainer config={usageChartConfig} className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart accessibilityLayer data={monthlyData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                                                <CartesianGrid vertical={false} />
                                                <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                                                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                                                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                                                <Bar dataKey="actions" fill="var(--color-actions)" radius={4} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
