
'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TerminalSquare, Sparkles, Loader2, Lightbulb } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { generateSnippetFromPrompt } from '@/actions/code-snippet';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CodeBlock } from '@/components/codepilot/code-block';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const supportedLanguages = [
    { value: 'typescript', label: 'TypeScript' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'csharp', label: 'C#' },
    { value: 'c', label: 'C' },
    { value: 'cpp', label: 'C++' },
    { value: 'sql', label: 'SQL' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
];

export default function CodeGptPage() {
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ codeSnippet: string; explanation: string; } | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not logged in' });
      return;
    }
    setIsLoading(true);
    setResult(null);

    const aiResult = await generateSnippetFromPrompt(user.id, prompt, language);

    if ('error' in aiResult) {
      toast({ variant: 'destructive', title: 'AI Generation Failed', description: aiResult.error });
    } else {
      setResult(aiResult);
    }
    setIsLoading(false);
  };

  return (
    <div className="theme-code-gpt min-h-screen flex flex-col bg-background">
      <DashboardHeader />
      <main className="flex-1 container mx-auto p-8">
        <div className="w-full max-w-7xl mx-auto space-y-8">
          <Card className="bg-card/50">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-pink-500/10 rounded-full">
                  <TerminalSquare className="h-8 w-8 text-pink-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-semibold text-pink-400">Code GPT</CardTitle>
                  <CardDescription>
                    Describe what you want to build in plain English, select a language, and let the AI generate the code for you.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                   <Label htmlFor="prompt-input">Your Request</Label>
                   <Textarea
                    id="prompt-input"
                    placeholder='e.g., "A typescript function that fetches data from an API and handles errors gracefully."'
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isLoading}
                    className="min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="language-select">Language</Label>
                    <Select value={language} onValueChange={setLanguage} disabled={isLoading}>
                      <SelectTrigger id="language-select">
                        <SelectValue placeholder="Select a language" />
                      </SelectTrigger>
                      <SelectContent>
                        {supportedLanguages.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
              </div>
               <div className="flex justify-center pt-4">
                  <Button onClick={handleGenerate} disabled={!prompt || isLoading} className="bg-pink-600 hover:bg-pink-700 text-white">
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                    ) : (
                      <><Sparkles className="mr-2 h-4 w-4" /> Generate Code</>
                    )}
                  </Button>
                </div>
            </CardContent>
          </Card>

          {isLoading && (
            <Card className="bg-card/50">
              <CardContent className="flex items-center justify-center p-12">
                <LoadingSpinner text="The AI is writing your code..." />
              </CardContent>
            </Card>
          )}

          {result && (
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-pink-400 flex items-center gap-2">
                  <Lightbulb />
                  Generated Snippet
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                 <CodeBlock
                    code={result.codeSnippet}
                    language={language}
                  />

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
