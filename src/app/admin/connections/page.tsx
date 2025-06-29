'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Wand2, User, Star, FileScan } from 'lucide-react';

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const featureConfig = {
    chat: { label: "Chat", color: "hsl(var(--chart-1))" },
    explain: { label: "Explain Code", color: "hsl(var(--chart-2))" },
    refactor: { label: "Refactor", color: "hsl(var(--chart-3))" },
    bugs: { label: "Find Bugs", color: "hsl(var(--chart-4))" },
    test: { label: "Generate Test", color: "hsl(var(--chart-5))" },
    docs: { label: "Generate Docs", color: "hsl(var(--chart-1))" },
    sdd: { label: "Generate SDD", color: "hsl(var(--chart-2))" },
    analyze: { label: "Analyze Diff", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

const getMockData = (period: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    const base = {
        daily: 1,
        weekly: 7,
        monthly: 30,
        yearly: 365
    };
    const multiplier = base[period];

    const data = {
        totalActions: 124 * multiplier,
        avgActionsPerUser: (5.2 * (Math.random() * 0.4 + 0.8)).toFixed(1),
        mostUsedFeature: "Chat",
        filesAnalyzed: 42 * multiplier,
        features: [
            { name: "Chat", actions: 60 * multiplier },
            { name: "Explain Code", actions: 25 * multiplier },
            { name: "Refactor Code", actions: 15 * multiplier },
            { name: "Find Bugs", actions: 10 * multiplier },
            { name: "Generate Test", actions: 8 * multiplier },
            { name: "Generate Docs", actions: 4 * multiplier },
            { name: "Generate SDD", actions: 1 * multiplier },
            { name: "Analyze Diff", actions: 1 * multiplier },
        ],
        trend: [] as { name: string; actions: number }[],
    };

    switch (period) {
        case 'daily':
            data.trend = Array.from({ length: 24 }, (_, i) => ({ name: `${i}:00`, actions: Math.floor(Math.random() * 20) + 5 }));
            break;
        case 'weekly':
            data.trend = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({ name: day, actions: Math.floor(Math.random() * 150) + 50 }));
            break;
        case 'monthly':
            data.trend = Array.from({ length: 30 }, (_, i) => ({ name: `Day ${i + 1}`, actions: Math.floor(Math.random() * 180) + 60 }));
            break;
        case 'yearly':
            data.trend = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => ({ name: month, actions: Math.floor(Math.random() * 2000) + 500 }));
            break;
    }
    return data;
};

function UsageStatsContent({ period }: { period: 'daily' | 'weekly' | 'monthly' | 'yearly' }) {
    const data = useMemo(() => getMockData(period), [period]);
    const totalFeatureActions = useMemo(() => data.features.reduce((acc, f) => acc + f.actions, 0), [data.features]);

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total AI Actions</CardTitle>
                        <Wand2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.totalActions.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Actions / User</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.avgActionsPerUser}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Most Used Feature</CardTitle>
                        <Star className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.mostUsedFeature}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Files Analyzed</CardTitle>
                        <FileScan className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.filesAnalyzed.toLocaleString()}</div>
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
                                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                                    <Legend />
                                    <Line type="monotone" dataKey="actions" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
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
                                    <Tooltip content={<ChartTooltipContent hideLabel />} />
                                    <Pie data={data.features} dataKey="actions" nameKey="name" cx="50%" cy="50%" outerRadius={120} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                                        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                                        return (percent > 0.05) ? <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">{(percent * 100).toFixed(0)}%</text> : null;
                                    }}>
                                        {data.features.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Legend />
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
                                    <TableCell className="text-right">{((feature.actions / totalFeatureActions) * 100).toFixed(2)}%</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
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
