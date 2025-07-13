
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FileTerminal, FolderGit, GitCompare, LifeBuoy, Wand2, Workflow, TerminalSquare, FlaskConical, FilePenLine } from 'lucide-react';
import Link from 'next/link';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { cn } from '@/lib/utils';

const features = [
  {
    title: 'Repo Analyzer',
    description: 'Connect to your Bitbucket projects to browse code, gain AI-driven insights, and refactor seamlessly.',
    icon: FolderGit,
    href: '/repo-insight',
    color: 'text-blue-400',
    borderColor: 'hover:border-blue-400',
  },
  {
    title: 'Code Pilot',
    description: 'Paste or upload any code snippet for instant AI analysis, refactoring, and unit test generation.',
    icon: FileTerminal,
    href: '/codepilot',
    color: 'text-purple-400',
    borderColor: 'hover:border-purple-400',
  },
  {
    title: 'Code GPT',
    description: 'Generates context-aware code blocks based on natural language for any supported language.',
    icon: TerminalSquare,
    href: '/code-gpt',
    color: 'text-pink-400',
    borderColor: 'hover:border-pink-400',
  },
  {
    title: 'Diagram Forge',
    description: 'Convert text descriptions into professional diagrams with real-time preview and editing.',
    icon: Workflow,
    href: '/diagram-forge',
    color: 'text-cyan-400',
    borderColor: 'hover:border-cyan-400',
  },
  {
    title: 'Code Fiddle',
    description: 'A code playground to quickly test snippets for various languages with real-time feedback.',
    icon: FlaskConical,
    href: '/code-fiddle',
    color: 'text-yellow-400',
    borderColor: 'hover:border-yellow-400',
  },
  {
    title: 'Debug Assist',
    description: 'Analyzes error messages and suggests potential solutions.',
    icon: LifeBuoy,
    href: '/waiki',
    color: 'text-red-400',
    borderColor: 'hover:border-red-400',
  },
  {
    title: 'Smart Match',
    description: 'Compare two code snippets or text blocks to see a line-by-line analysis of the differences.',
    icon: GitCompare,
    href: '/code-compare',
    color: 'text-orange-400',
    borderColor: 'hover:border-orange-400',
  },
  {
    title: 'Regex Wizard',
    description: 'Converts plain English to battle-tested regex, with live testing and explanations.',
    icon: Wand2,
    href: '/regex-wizard',
    color: 'text-green-400',
    borderColor: 'hover:border-green-400',
  },
  {
    title: 'Word Craft',
    description: 'An AI-powered text refinement tool for reports, emails, and more.',
    icon: FilePenLine,
    href: '/word-craft',
    color: 'text-indigo-400',
    borderColor: 'hover:border-indigo-400',
  },
];

export default function DashboardPage() {
  return (
    <div className="theme-dashboard min-h-screen flex flex-col bg-background">
      <DashboardHeader />
      <main className="flex-1 container mx-auto p-4 md:p-6 flex flex-col justify-center">
        <div className="mb-8 text-center">
            <h1 className="text-3xl font-normal tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Welcome to AD Labs</h1>
            <p className="mt-2 text-base md:text-lg text-muted-foreground">Your integrated suite for AI-powered development. Select a tool to begin.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link href={feature.href} key={feature.title} className="group">
                <Card className={cn(
                  "transition-colors duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col h-full",
                  feature.borderColor
                  )}>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <Icon className={`w-8 h-8 ${feature.color}`} />
                      <CardTitle className={`font-normal ${feature.color}`}>{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
