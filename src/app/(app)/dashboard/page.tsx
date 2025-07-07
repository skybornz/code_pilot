'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Bot, FileTerminal, FolderGit, GitCompare } from 'lucide-react';
import Link from 'next/link';

const features = [
  {
    title: 'RepoInsight',
    description: 'Manage your code repositories and analyze project history.',
    icon: FolderGit,
    href: '/repo-insight',
    color: 'text-blue-400',
  },
  {
    title: 'CodePilot',
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
    title: 'CodeCompare',
    description: 'Perform an extensive, AI-driven comparison between two files.',
    icon: GitCompare,
    href: '/code-compare',
    color: 'text-orange-400',
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to AD Labs. Select a tool to get started.</p>
      </header>
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
    </div>
  );
}
