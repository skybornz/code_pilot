
'use client';

import { useState, useRef, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TerminalSquare, Sparkles, Loader2, Lightbulb, Send, User, Bot, RefreshCcw } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { generateSnippetFromPrompt } from '@/actions/code-snippet';
import { refineCodeSnippet } from '@/actions/refine-code-snippet';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CodeBlock } from '@/components/codepilot/code-block';
import type { Message } from '@/ai/flows/copilot-chat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogoMark } from '@/components/codepilot/logo-mark';
import { Badge } from '@/components/ui/badge';

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
  const [isRefining, setIsRefining] = useState(false);
  const [result, setResult] = useState<{ codeSnippet: string; explanation: string; } | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  
  const { user } = useAuth();
  const { toast } = useToast();
  const chatScrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollAreaRef.current) {
        chatScrollAreaRef.current.scrollTo({
            top: chatScrollAreaRef.current.scrollHeight,
            behavior: 'smooth',
        });
    }
  }, [chatMessages, isRefining]);
  
  const resetToInitial = () => {
    setResult(null);
    setChatMessages([]);
    setPrompt('');
    setChatInput('');
  };

  const handleGenerate = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not logged in' });
      return;
    }
    setIsLoading(true);
    setResult(null);
    setChatMessages([]);

    const aiResult = await generateSnippetFromPrompt(user.id, prompt, language);

    if ('error' in aiResult) {
      toast({ variant: 'destructive', title: 'AI Generation Failed', description: aiResult.error });
    } else {
      setResult(aiResult);
    }
    setIsLoading(false);
  };

  const handleRefine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !result || !chatInput.trim()) {
      return;
    }

    const newMessages: Message[] = [...chatMessages, { role: 'user', content: chatInput }];
    setChatMessages(newMessages);
    const instruction = chatInput;
    setChatInput('');
    setIsRefining(true);
    
    const refineResult = await refineCodeSnippet(user.id, result.codeSnippet, instruction, language);

    if ('error' in refineResult) {
      toast({ variant: 'destructive', title: 'Refinement Failed', description: refineResult.error });
      setChatMessages(prev => [...prev, { role: 'model', content: `Sorry, I couldn't refine the code. Error: ${refineResult.error}` }]);
    } else {
      setResult(refineResult); // Update the main result with the refined code
      setChatMessages(prev => [...prev, { role: 'model', content: `Here is the updated code based on your request.` }]);
    }
    setIsRefining(false);
  };

  const renderInitialView = () => (
    <Card className="bg-card/50">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="p-2 bg-pink-500/10 rounded-full">
            <TerminalSquare className="h-8 w-8 text-pink-400" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold text-pink-400">Code GPT</CardTitle>
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
  );

  const renderWorkspaceView = () => (
     <div className="flex-1 flex gap-8 min-h-0">
        {/* Left Panel */}
        <div className="w-1/2 flex flex-col gap-8 min-h-0">
            <Card className="bg-card/50 flex-shrink-0">
                <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                        <CardTitle className="text-lg text-pink-400">Original Request</CardTitle>
                        <p className="text-sm text-muted-foreground italic mt-2">"{prompt}"</p>
                    </div>
                     <Button variant="outline" onClick={resetToInitial}>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        New Code
                    </Button>
                </CardHeader>
                <CardContent>
                    <Badge>{language}</Badge>
                </CardContent>
            </Card>
            
            {result && (
              <Card className="bg-card/50 flex-shrink-0">
                 <CardHeader>
                    <CardTitle className="text-lg font-semibold text-pink-400 flex items-center gap-2"><Lightbulb className="h-4 w-4" /> Explanation</CardTitle>
                 </CardHeader>
                 <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.explanation}</p>
                 </CardContent>
              </Card>
            )}

            <Card className="bg-card/50 flex-1 flex flex-col min-h-0">
                <CardHeader>
                    <CardTitle className="text-lg text-pink-400">Refine Code</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 p-0">
                    <ScrollArea className="h-full pr-4" ref={chatScrollAreaRef}>
                        <div className="space-y-4 px-6">
                            {chatMessages.map((message, index) => (
                                <div key={index} className={cn('flex items-start gap-3 w-full', message.role === 'user' && 'justify-end')}>
                                    {message.role === 'model' && (
                                        <Avatar className="h-8 w-8 border bg-background flex-shrink-0"><AvatarFallback className="bg-transparent"><LogoMark /></AvatarFallback></Avatar>
                                    )}
                                    <div className={cn('p-3 rounded-lg max-w-[85%] text-sm break-words', message.role === 'user' ? 'bg-pink-600 text-white' : 'bg-muted')}>
                                        <p className="whitespace-pre-wrap">{message.content}</p>
                                    </div>
                                    {message.role === 'user' && <Avatar className="h-8 w-8 flex-shrink-0"><AvatarFallback><User className="h-5 w-5"/></AvatarFallback></Avatar>}
                                </div>
                            ))}
                             {isRefining && (
                                <div className="flex items-start gap-3"><Avatar className="h-8 w-8 border bg-background flex-shrink-0"><AvatarFallback className="bg-transparent"><LogoMark /></AvatarFallback></Avatar><div className="p-3 rounded-lg bg-muted flex items-center"><Loader2 className="h-5 w-5 animate-spin"/></div></div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
                <div className="p-6 pt-4 border-t">
                    <form onSubmit={handleRefine} className="flex items-start gap-2">
                        <Textarea value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="e.g., Add comments to the code" disabled={isRefining} className="min-h-[40px] max-h-[120px]" />
                        <Button type="submit" size="icon" className="bg-pink-600 hover:bg-pink-700 text-white flex-shrink-0" disabled={isRefining || !chatInput.trim()}><Send className="h-4 w-4" /></Button>
                    </form>
                </div>
            </Card>
        </div>

        {/* Right Panel */}
        <Card className="w-1/2 bg-card/50 flex flex-col min-h-0">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-pink-400 flex items-center gap-2">
              <Sparkles />
              Generated Snippet
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0">
              {result && (
                  <CodeBlock
                      code={result.codeSnippet}
                      language={language}
                  />
              )}
          </CardContent>
        </Card>
     </div>
  );

  return (
    <div className="theme-code-gpt min-h-screen flex flex-col bg-background">
      <DashboardHeader />
      <main className="flex-1 container mx-auto p-8 flex flex-col min-h-0">
        {isLoading && (
            <div className="flex-1 flex items-center justify-center">
                <LoadingSpinner text="The AI is writing your code..." />
            </div>
        )}

        {!isLoading && !result && renderInitialView()}
        
        {!isLoading && result && (
            <div className="flex-1 flex flex-col min-h-0">
                {renderWorkspaceView()}
            </div>
        )}
      </main>
    </div>
  );
}

    