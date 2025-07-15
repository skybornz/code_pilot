
'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { GitCompare, Sparkles, Loader2 } from 'lucide-react';
import { diffLines, type Change } from 'diff';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { performAiAction } from '@/actions/ai';
import type { AnalyzeDiffOutput } from '@/components/codepilot/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { MessageContent } from '@/components/codepilot/message-content';

export default function SmartMatchPage() {
  const [textA, setTextA] = useState('');
  const [textB, setTextB] = useState('');
  const [diffResult, setDiffResult] = useState<Change[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeDiffOutput | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleCompareAndAnalyze = async () => {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Not logged in',
            description: 'You must be logged in to use this feature.'
        });
        return;
    }
    
    setIsAnalyzing(true);
    setAnalysisResult(null);

    // Perform local diff
    const result = diffLines(textA, textB);
    setDiffResult(result);

    // Perform AI analysis
    // Assuming 'typescript' as a default language for analysis. This can be made selectable in the future.
    const aiResult = await performAiAction(user.id, 'analyze-diff', textB, 'typescript', textA);

    if ('error' in aiResult) {
        toast({
            variant: 'destructive',
            title: 'AI Analysis Failed',
            description: aiResult.error,
        });
    } else if (aiResult.type === 'analyze-diff') {
        setAnalysisResult(aiResult.data);
    }
    
    setIsAnalyzing(false);
  };

  return (
    <div className="theme-code-compare min-h-screen flex flex-col bg-background">
      <DashboardHeader />
      <main className="flex-1 container mx-auto p-8">
        <div className="w-full max-w-7xl mx-auto space-y-8">
          <Card className="bg-card/50">
            <CardHeader>
              <div className="flex items-start gap-4">
                  <div className="p-2 bg-orange-500/10 rounded-full">
                      <GitCompare className="h-8 w-8 text-orange-400" />
                  </div>
                  <div>
                      <CardTitle className="text-xl font-semibold text-orange-400">Smart Match</CardTitle>
                      <CardDescription>Paste content into the two panes below to see a line-by-line analysis and an AI-powered summary of the differences.</CardDescription>
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
                  disabled={isAnalyzing}
                />
                <Textarea
                  placeholder="Paste modified content here..."
                  className="min-h-[300px] font-mono text-xs"
                  value={textB}
                  onChange={(e) => setTextB(e.target.value)}
                  disabled={isAnalyzing}
                />
              </div>
              <div className="mt-4 flex justify-center">
                <Button onClick={handleCompareAndAnalyze} disabled={(!textA && !textB) || isAnalyzing} className="bg-orange-600 hover:bg-orange-700 text-white">
                  {isAnalyzing ? (
                      <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                      </>
                  ) : (
                      <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Compare & Analyze
                      </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {diffResult && (
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2 text-orange-400"><GitCompare className="h-5 w-5" />Comparison Result</CardTitle>
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

          {isAnalyzing && !analysisResult && (
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2 text-orange-400"><Sparkles className="h-5 w-5" /> AI Analysis</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center p-12">
                <LoadingSpinner text="AI is analyzing the changes..." />
              </CardContent>
            </Card>
          )}

          {analysisResult && (
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2 text-orange-400"><Sparkles className="h-5 w-5" /> AI Analysis</CardTitle>
                <CardDescription>An AI-powered summary and analysis of the changes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  <MessageContent content={analysisResult} />
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
