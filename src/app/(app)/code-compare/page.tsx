'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GitCompare } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';

export default function CodeComparePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DashboardHeader />
      <main className="flex-1 flex items-center justify-center container mx-auto p-8">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto bg-orange-500/10 rounded-full p-3 w-fit">
              <GitCompare className="h-8 w-8 text-orange-400" />
            </div>
            <CardTitle className="mt-4">Code Compare</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">This feature is coming soon.</p>
            <p className="text-sm text-muted-foreground/80 mt-2">
              A powerful AI-driven file comparison tool will be available here.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
