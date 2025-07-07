'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Bot, FileTerminal, FolderGit, GitCompare } from 'lucide-react';
import Link from 'next/link';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';

const features = [
  {
    title: 'Repo Insight',
    description: 'Manage your bit bucket repositories and analyze the code using AI tools directly',
    icon: FolderGit,
    href: '/repo-insight',
    color: 'text-blue-400',
  },
  {
    title: 'Code Pilot',
    description: 'Get AI-powered analysis on any code snippet or file.',
    icon: FileTerminal,
    href: '/codepilot',
    color: 'text-purple-400',
  },
  {
    title: 'W.A.I.K.I',
    description: 'Your personal AI chat assistant for all things code.',
    icon: Bot,
    href: '/waiki',
    color: 'text-green-400',
  },
  {
    title: 'Code Compare',
    description: 'Perform an extensive, AI-driven comparison between two files.',
    icon: GitCompare,
    href: '/code-compare',
    color: 'text-orange-400',
  },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DashboardHeader />
      <main className="flex-1 container mx-auto p-8">
        <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Welcome to AD Labs</h1>
            <p className="mt-4 text-lg text-muted-foreground">Your integrated suite for AI-powered development. Select a tool to begin.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <Link href={feature.href} key={feature.title} className="group">
              <Card className="h-full hover:border-primary transition-colors duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <feature.icon className={`w-8 h-8 ${feature.color}`} />
                    <CardTitle>{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
