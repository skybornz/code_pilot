'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GitCompare } from 'lucide-react';

export default function CodeComparePage() {
  return (
    <div className="flex items-center justify-center h-full">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto bg-orange-500/10 rounded-full p-3 w-fit">
            <GitCompare className="h-8 w-8 text-orange-400" />
          </div>
          <CardTitle className="mt-4">CodeCompare</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">This feature is coming soon.</p>
          <p className="text-sm text-muted-foreground/80 mt-2">
            A powerful AI-driven file comparison tool will be available here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
