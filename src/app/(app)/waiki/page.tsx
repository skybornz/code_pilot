'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';

export default function WaikiPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DashboardHeader />
      <main className="flex-1 flex items-center justify-center container mx-auto p-8">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto bg-green-500/10 rounded-full p-3 w-fit">
              <Bot className="h-8 w-8 text-green-400" />
            </div>
            <CardTitle className="mt-4">W.A.I.K.I</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">This feature has been temporarily disabled.</p>
            <p className="text-sm text-muted-foreground/80 mt-2">
              We'll revisit this conversational AI feature soon.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
