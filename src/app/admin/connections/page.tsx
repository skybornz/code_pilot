
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pie, PieChart, ResponsiveContainer, Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts';
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Wand2, User, Users, Star, AlertCircle } from 'lucide-react';
import { getUsageStatistics } from '@/actions/activity';
import type { UsageStatistics } from '@/lib/activity-database';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

function UsageStatsContent({ period }: { period: 'daily' | 'weekly' | 'monthly' | 'yearly' }) {
    const [data, setData] = useState<UsageStatistics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await getUsageStatistics(period);
            setData(result);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch usage statistics. Please ensure the database schema is up to date and the server is running.');
        } finally {
            setIsLoading(false);
        }
    }, [period]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const totalFeatureActions = useMemo(() => {
        if (!data?.features) return 0;
        return data.features.reduce((acc, f) => acc + f.actions, 0);
    }, [data?.features]);

    if (isLoading) {
        return <UsageStatsSkeleton />;
    }

    if (error || !data) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error || 'An unknown error occurred.'}</AlertDescription>
            </Alert>
        );
    }
    
    const featureConfig: ChartConfig = (data.features || []).reduce((acc, feature, index) => {
        const key = feature.name.replace(/\s+/g, ''); // create a key without spaces
        acc[key] = { label: feature.name, color: COLORS[index % COLORS.length] };
        return acc;
    }, {} as ChartConfig);

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">{data.totalUsers.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total AI Actions</CardTitle>
                        <Wand2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">{data.totalActions.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Actions / User</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">{data.avgActionsPerUser.toFixed(1)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Most Used Feature</CardTitle>
                        <Star className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">{data.mostUsedFeature}</div>
                    </CardContent>
                </Card>
            </div>
            <div className="grid gap-6 md:grid-cols-5">
                <Card className="md:col-span-3">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold text-primary">AI Actions Over Time</CardTitle>
                        <CardDescription>A trend of total AI actions over the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                         <ChartContainer config={{}} className="h-[350px] w-full">
                            <ResponsiveContainer>
                                <LineChart data={data.trend} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} tickMargin={10} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false}/>
                                    <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                                    <Legend />
                                    <Line type="monotone" dataKey="actions" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Actions" />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold text-primary">AI Feature Distribution</CardTitle>
                        <CardDescription>Breakdown of AI actions by feature.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={featureConfig} className="h-[350px] w-full">
                            <ResponsiveContainer>
                                <PieChart>
                                    <Tooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
                                    <Pie data={data.features} dataKey="actions" nameKey="name" cx="50%" cy="50%" outerRadius={120} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                                        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                                        return (percent > 0.05) ? <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">{(percent * 100).toFixed(0)}%</text> : null;
                                    }}>
                                        {data.features.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={featureConfig[entry.name.replace(/\s+/g, '')]?.color || COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl font-semibold text-primary">Detailed Usage Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Feature</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                                <TableHead className="text-right">% of Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.features.map(feature => (
                                <TableRow key={feature.name}>
                                    <TableCell className="font-medium">{feature.name}</TableCell>
                                    <TableCell className="text-right">{feature.actions.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">{totalFeatureActions > 0 ? ((feature.actions / totalFeatureActions) * 100).toFixed(2) : 0}%</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}

function UsageStatsSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
                <Card><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
                <Card><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
                <Card><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
            </div>
            <div className="grid gap-6 md:grid-cols-5">
                <Card className="md:col-span-3">
                    <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-[350px] w-full" />
                    </CardContent>
                </Card>
                <Card className="md:col-span-2">
                     <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-[350px] w-full" />
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/3" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-40 w-full" />
                </CardContent>
            </Card>
        </div>
    )
}


export default function UsageStatisticsPage() {
    return (
        <Tabs defaultValue="daily" className="space-y-4">
            <TabsList>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>
            <TabsContent value="daily"><UsageStatsContent period="daily" /></TabsContent>
            <TabsContent value="weekly"><UsageStatsContent period="weekly" /></TabsContent>
            <TabsContent value="monthly"><UsageStatsContent period="monthly" /></TabsContent>
            <TabsContent value="yearly"><UsageStatsContent period="yearly" /></TabsContent>
        </Tabs>
    );
}
