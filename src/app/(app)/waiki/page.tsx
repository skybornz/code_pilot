'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot } from 'lucide-react';

export default function WaikiPage() {
  return (
    <div className="flex items-center justify-center h-full">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto bg-green-500/10 rounded-full p-3 w-fit">
            <Bot className="h-8 w-8 text-green-400" />
          </div>
          <CardTitle className="mt-4">W.A.I.K.I</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">This feature is coming soon.</p>
          <p className="text-sm text-muted-foreground/80 mt-2">
            An advanced AI chat assistant will be available here to help with all your coding questions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
