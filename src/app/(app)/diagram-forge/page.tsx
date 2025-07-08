
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sitemap } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';

export default function DiagramForgePage() {
  return (
    <div className="theme-diagram-forge min-h-screen flex flex-col bg-background">
      <DashboardHeader />
      <main className="flex-1 flex items-center justify-center container mx-auto p-8">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto bg-cyan-500/10 rounded-full p-3 w-fit">
              <Sitemap className="h-8 w-8 text-cyan-400" />
            </div>
            <CardTitle className="mt-4 text-cyan-400">Diagram Forge</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">This feature is coming soon.</p>
            <p className="text-sm text-muted-foreground/80 mt-2">
              Soon, you'll be able to convert text descriptions into professional diagrams.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
