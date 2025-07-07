'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileTerminal } from 'lucide-react';

export default function CodePilotPage() {
  return (
    <div className="flex items-center justify-center h-full">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto bg-purple-500/10 rounded-full p-3 w-fit">
            <FileTerminal className="h-8 w-8 text-purple-400" />
          </div>
          <CardTitle className="mt-4">CodePilot</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">This feature is coming soon.</p>
          <p className="text-sm text-muted-foreground/80 mt-2">
            Soon, you'll be able to paste code or upload files for instant AI analysis.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
