'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { GitCompare, Wand2 } from 'lucide-react';
import { diffLines, type Change } from 'diff';

export default function SmartMatchPage() {
  const [textA, setTextA] = useState('');
  const [textB, setTextB] = useState('');
  const [diffResult, setDiffResult] = useState<Change[] | null>(null);

  const handleCompare = () => {
    const result = diffLines(textA, textB);
    setDiffResult(result);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DashboardHeader />
      <main className="flex-1 container mx-auto p-8">
        <div className="w-full max-w-6xl mx-auto space-y-8">
          <Card className="bg-card/50">
            <CardHeader>
              <div className="flex items-start gap-4">
                  <div className="p-2 bg-orange-500/10 rounded-full">
                      <GitCompare className="h-8 w-8 text-orange-400" />
                  </div>
                  <div>
                      <CardTitle className="text-2xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Smart Match</CardTitle>
                      <CardDescription>Paste content into the two panes below to see a line-by-line analysis of the differences.</CardDescription>
                  </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Textarea
                  placeholder="Paste original content here..."
                  className="min-h-[300px] font-mono text-xs"
                  value={textA}
                  onChange={(e) => setTextA(e.target.value)}
                />
                <Textarea
                  placeholder="Paste modified content here..."
                  className="min-h-[300px] font-mono text-xs"
                  value={textB}
                  onChange={(e) => setTextB(e.target.value)}
                />
              </div>
              <div className="mt-4 flex justify-center">
                <Button onClick={handleCompare} disabled={!textA && !textB}>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Compare
                </Button>
              </div>
            </CardContent>
          </Card>

          {diffResult && (
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle>Comparison Result</CardTitle>
                <CardDescription>Lines in red were removed, and lines in green were added. Unchanged lines are also shown for context.</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="p-4 rounded-md bg-muted/80 overflow-x-auto text-xs font-mono">
                  <code>
                    {diffResult.map((part, index) => {
                      const lines = part.value.split('\n');
                      if (lines[lines.length - 1] === '') {
                        lines.pop();
                      }
                      
                      const colorClass = part.added
                        ? 'bg-green-500/20'
                        : part.removed
                        ? 'bg-red-500/20'
                        : '';
                      
                      const prefix = part.added ? '+' : part.removed ? '-' : ' ';

                      return lines.map((line, i) => (
                        <div key={`${index}-${i}`} className={colorClass}>
                            <span className="w-5 inline-block text-center select-none text-muted-foreground">{prefix}</span>
                            <span>{line}</span>
                        </div>
                      ));
                    })}
                  </code>
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
