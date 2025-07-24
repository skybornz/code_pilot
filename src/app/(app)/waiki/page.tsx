
'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { LifeBuoy, Wand2, Loader2, Lightbulb, Info } from 'lucide-react';
import { MessageContent } from '@/components/codepilot/message-content';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { analyzeError } from '@/actions/debug';
import type { DebugErrorOutput } from '@/ai/flows/debug-error';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CodeBlock } from '@/components/codepilot/code-block';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Label } from '@/components/ui/label';


export default function DebugAssistPage() {
  const [errorMessage, setErrorMessage] = useState('');
  const [errorContext, setErrorContext] = useState('');
  const [analysis, setAnalysis] = useState<DebugErrorOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Not logged in',
            description: 'You must be logged in to use this feature.'
        });
        return;
    }
    setIsLoading(true);
    setAnalysis(null);
    
    const result = await analyzeError(user.id, errorMessage, errorContext);

    if ('error' in result) {
        toast({
            variant: 'destructive',
            title: 'Analysis Failed',
            description: result.error,
        });
        setAnalysis(null);
    } else {
        setAnalysis(result);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="theme-waiki min-h-screen flex flex-col bg-background">
      <DashboardHeader />
      <main className="flex-1 container mx-auto p-8">
        <div className="w-full max-w-7xl mx-auto space-y-8">
            <Card className="bg-card/50">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-red-500/10 rounded-full">
                    <LifeBuoy className="h-8 w-8 text-red-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold text-red-400">Debug Assist</CardTitle>
                    <CardDescription>Paste an error message and provide context to get AI-powered analysis and solutions.</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Card */}
                <Card className="bg-card/50">
                    <CardHeader>
                        <CardTitle className="text-lg text-red-400 flex items-center gap-2">
                            <Info className="h-5 w-5" />
                            Error Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="error-message" className="mb-2 block">Error Message / Stack Trace</Label>
                        <Textarea
                          id="error-message"
                          placeholder="Paste your full error message here..."
                          className="min-h-[150px] font-mono text-xs"
                          value={errorMessage}
                          onChange={(e) => setErrorMessage(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                      <div>
                        <Label htmlFor="error-context" className="mb-2 block">Context (Optional)</Label>
                         <Textarea
                          id="error-context"
                          placeholder="Describe when and how you encountered this error. e.g., 'I get this error when I click the submit button on the user profile page.'"
                          className="min-h-[100px]"
                          value={errorContext}
                          onChange={(e) => setErrorContext(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button onClick={handleAnalyze} disabled={!errorMessage || isLoading} className="bg-red-600 hover:bg-red-700 text-white">
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Wand2 className="mr-2 h-4 w-4" />
                            Analyze Error
                          </>
                        )}
                      </Button>
                    </CardFooter>
                </Card>

                {/* Output Card */}
                 <Card className="bg-card/50">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold text-red-400 flex items-center gap-2">
                            <Lightbulb className="h-6 w-6" />
                            Analysis & Suggestions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="text-center text-muted-foreground p-8 min-h-[400px] flex items-center justify-center">
                                <LoadingSpinner text="Generating suggestions..." />
                            </div>
                        ) : analysis ? (
                            <div className="space-y-6">
                                <Alert>
                                    <Lightbulb className="h-4 w-4" />
                                    <AlertTitle>Potential Cause</AlertTitle>
                                    <AlertDescription>
                                        <MessageContent content={analysis.potentialCause} />
                                    </AlertDescription>
                                </Alert>
                                
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">Recommended Fixes</h3>
                                    {analysis.recommendedFixes.length > 0 ? (
                                        <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
                                            {analysis.recommendedFixes.map((fix, index) => (
                                                <AccordionItem value={`item-${index}`} key={index}>
                                                    <AccordionTrigger>
                                                        <span className="text-left">Fix #{index + 1}</span>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="space-y-4 pt-4">
                                                        <p className="text-muted-foreground">{fix.description}</p>
                                                        {fix.codeSnippet && (
                                                            <CodeBlock
                                                                code={fix.codeSnippet}
                                                                language="javascript" // Assuming js, can be improved
                                                            />
                                                        )}
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
                                    ) : (
                                        <p className="text-muted-foreground text-sm">No specific fixes were recommended.</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="min-h-[400px] flex items-center justify-center">
                                <p className="text-muted-foreground text-center">
                                    Analysis will appear here once you submit an error.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
      </main>
    </div>
  );
}
