
'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { LifeBuoy, Wand2, Loader2 } from 'lucide-react';
import { MessageContent } from '@/components/codepilot/message-content';

export default function DebugAssistPage() {
  const [errorMessage, setErrorMessage] = useState('');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setAnalysis(null);
    // Placeholder for AI analysis logic
    await new Promise(resolve => setTimeout(resolve, 1500));
    setAnalysis(`
### Potential Cause
The error message \`TypeError: Cannot read properties of undefined (reading 'map')\` typically occurs when you try to call the \`.map()\` method on a variable that is \`undefined\`. This often happens with data fetched from an API that hasn't loaded yet or returned an unexpected structure.

### Recommended Fixes

1.  **Add a Conditional Check:** Before rendering, ensure the data array is not undefined or null.

    \`\`\`javascript
    {data && data.map(item => (
      // ... your component logic
    ))}
    \`\`\`

2.  **Initialize State with an Empty Array:** Set the initial state of your data to an empty array to prevent it from being undefined.

    \`\`\`javascript
    const [data, setData] = useState([]);
    \`\`\`
`);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DashboardHeader />
      <main className="flex-1 container mx-auto p-8 flex justify-center">
        <div className="w-full max-w-4xl space-y-8">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-red-500/10 rounded-full">
                  <LifeBuoy className="h-8 w-8 text-red-400" />
                </div>
                <div>
                  <CardTitle>Debug Assist</CardTitle>
                  <CardDescription>Paste an error message or stack trace to get AI-powered analysis and solutions.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste your error message here..."
                className="min-h-[200px] font-mono text-xs"
                value={errorMessage}
                onChange={(e) => setErrorMessage(e.target.value)}
                disabled={isLoading}
              />
            </CardContent>
            <CardFooter>
              <Button onClick={handleAnalyze} disabled={!errorMessage || isLoading}>
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

          {(isLoading || analysis) && (
            <Card>
              <CardHeader>
                  <CardTitle>Analysis & Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                  {isLoading && (
                       <div className="text-center text-muted-foreground p-8">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                          <p>Generating suggestions...</p>
                      </div>
                  )}
                  {!isLoading && analysis && (
                    <MessageContent content={analysis} />
                  )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
