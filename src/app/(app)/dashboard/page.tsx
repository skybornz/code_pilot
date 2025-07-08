
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FileTerminal, FolderGit, GitCompare, LifeBuoy, Wand2, Sitemap } from 'lucide-react';
import Link from 'next/link';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';

const features = [
  {
    title: 'Repo Analyzer',
    description: 'Connect to your Bitbucket projects to browse code, gain AI-driven insights, and refactor seamlessly.',
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
    title: 'Debug Assist',
    description: 'Analyzes error messages and suggests potential solutions.',
    icon: LifeBuoy,
    href: '/waiki',
    color: 'text-red-400',
  },
  {
    title: 'Smart Match',
    description: 'Compare two code snippets or text blocks to see a line-by-line analysis of the differences.',
    icon: GitCompare,
    href: '/code-compare',
    color: 'text-orange-400',
  },
  {
    title: 'Regex Wizard',
    description: 'Converts plain English to battle-tested regex, with live testing and explanations.',
    icon: Wand2,
    href: '/regex-wizard',
    color: 'text-green-400',
  },
   {
    title: 'Diagram Forge',
    description: 'Convert text descriptions into professional diagrams with real-time preview and editing.',
    icon: Sitemap,
    href: '/diagram-forge',
    color: 'text-cyan-400',
  },
];

export default function DashboardPage() {
  return (
    <div className="theme-dashboard min-h-screen flex flex-col bg-background">
      <DashboardHeader />
      <main className="flex-1 container mx-auto p-8">
        <div className="mb-12 text-center">
            <h1 className="text-[2em] font-normal tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Welcome to AD Labs</h1>
            <p className="mt-4 text-lg text-muted-foreground">Your integrated suite for AI-powered development. Select a tool to begin.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Link href={feature.href} key={feature.title} className="group">
              <Card className="h-full hover:border-primary transition-colors duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <feature.icon className={`w-8 h-8 ${feature.color}`} />
                    <CardTitle className={`font-normal ${feature.color}`}>{feature.title}</CardTitle>
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
