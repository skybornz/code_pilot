
'use client';

import { useState, useMemo } from 'react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Wand2, Loader2, Lightbulb, Clipboard, ClipboardCheck } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getRegexFromPrompt } from '@/actions/regex';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function RegexTestResult({ testString, regex }: { testString: string; regex: string }) {
  const highlighted = useMemo(() => {
    if (!testString || !regex) {
      return <span className="text-muted-foreground">Your highlighted matches will appear here.</span>;
    }
    try {
      const re = new RegExp(regex, 'g');
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = re.exec(testString)) !== null) {
        if (match.index > lastIndex) {
          parts.push(testString.substring(lastIndex, match.index));
        }
        parts.push(
          <mark key={match.index} className="bg-green-500/30 text-foreground rounded px-1 py-0.5">
            {match[0]}
          </mark>
        );
        lastIndex = re.lastIndex;
        // Handle zero-length matches
        if (match[0].length === 0) {
            re.lastIndex++;
        }
      }

      if (lastIndex < testString.length) {
        parts.push(testString.substring(lastIndex));
      }
      return <>{parts}</>;
    } catch (e) {
      return <span className="text-red-400">Invalid Regex Pattern</span>;
    }
  }, [testString, regex]);

  return <pre className="p-4 rounded-md bg-muted/80 overflow-x-auto text-sm whitespace-pre-wrap break-words">{highlighted}</pre>;
}

export default function RegexWizardPage() {
  const [prompt, setPrompt] = useState('');
  const [testString, setTestString] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ regex: string; explanation: string } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not logged in' });
      return;
    }
    setIsLoading(true);
    setResult(null);

    const aiResult = await getRegexFromPrompt(user.id, prompt);

    if ('error' in aiResult) {
      toast({ variant: 'destructive', title: 'AI Generation Failed', description: aiResult.error });
    } else {
      setResult(aiResult);
    }
    setIsLoading(false);
  };

  const handleCopy = () => {
    if (!result?.regex) return;
    navigator.clipboard.writeText(result.regex);
    setIsCopied(true);
    toast({ title: "Regex copied to clipboard!" });
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="theme-regex-wizard min-h-screen flex flex-col bg-background">
      <DashboardHeader />
      <main className="flex-1 container mx-auto p-8">
        <div className="w-full max-w-7xl mx-auto space-y-8">
          <Card className="bg-card/50">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-green-500/10 rounded-full">
                  <Wand2 className="h-8 w-8 text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-semibold text-green-400">Regex Wizard</CardTitle>
                  <CardDescription>
                    Describe what you want to match in plain English, and the wizard will generate a battle-tested regular expression for you.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="prompt-input" className="mb-2 block">Describe your pattern</Label>
                  <Input
                    id="prompt-input"
                    placeholder='Try: "Match prices in USD but not EUR"'
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="flex justify-center pt-2">
                  <Button onClick={handleGenerate} disabled={!prompt || isLoading} className="bg-green-600 hover:bg-green-700 text-white">
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                    ) : (
                      <><Wand2 className="mr-2 h-4 w-4" /> Generate Regex</>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoading && (
            <Card className="bg-card/50">
              <CardContent className="flex items-center justify-center p-12">
                <LoadingSpinner text="The Regex Wizard is casting a spell..." />
              </CardContent>
            </Card>
          )}

          {result && (
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-green-400 flex items-center gap-2">
                  <Lightbulb />
                  Generated Result
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Generated Regex</h3>
                  <div className="flex items-center gap-2">
                    <pre className="flex-1 p-3 rounded-md bg-muted font-mono text-sm overflow-x-auto">
                      <code>{result.regex}</code>
                    </pre>
                    <Button variant="ghost" size="icon" onClick={handleCopy}>
                      {isCopied ? <ClipboardCheck className="h-5 w-5 text-green-400" /> : <Clipboard className="h-5 w-5" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Test Area</h3>
                   <div>
                    <Label htmlFor="test-string-input" className="text-sm text-muted-foreground">Paste your sample text here to see live matching.</Label>
                    <Textarea
                      id="test-string-input"
                      placeholder="e.g. Price: $10.99, but not €5.00"
                      className="min-h-[150px] font-mono text-xs mt-2"
                      value={testString}
                      onChange={(e) => setTestString(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="font-medium">Live Matches</Label>
                    <RegexTestResult testString={testString} regex={result.regex} />
                  </div>
                </div>

                <Alert>
                  <AlertTitle className="font-semibold flex items-center gap-2"><Lightbulb className="h-4 w-4" /> Explanation</AlertTitle>
                  <AlertDescription className="mt-2 whitespace-pre-wrap">{result.explanation}</AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
