'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Wand2, Send, User, Loader2 } from 'lucide-react';
import type { AIOutput } from './types';
import type { FindBugsOutput } from '@/ai/flows/find-bugs';
import type { RefactorCodeOutput } from '@/ai/flows/refactor-code';
import type { GenerateUnitTestOutput } from '@/ai/flows/generate-unit-test';
import type { GenerateCodeDocsOutput } from '@/ai/flows/generate-code-docs';
import type { GenerateSddOutput } from '@/ai/flows/generate-sdd';
import { CodeBlock } from './code-block';
import type { AnalyzeDiffOutput, ExplainCodeOutput } from './types';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { copilotChat, type Message } from '@/ai/flows/copilot-chat';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogoMark } from './logo-mark';
import { cn } from '@/lib/utils';
import { MessageContent } from './message-content';
import { Separator } from '../ui/separator';
import { getDefaultModel } from '@/actions/models';

interface AIOutputPanelProps {
  output: AIOutput | null;
  isLoading: boolean;
  messages: Message[];
  onMessagesChange: (messages: Message[]) => void;
  isChatLoading: boolean;
  setIsChatLoading: (isLoading: boolean) => void;
}

const formatAiOutputForChat = (output: AIOutput): string => {
  const { data, type, language } = output;
  let content = `Regarding your previous analysis on "${output.title}":\n\n`;

  if (type === 'explain') {
    const explanation = data as ExplainCodeOutput;
    content += `**Summary**\n${explanation.summary}\n\n**Breakdown**\n${explanation.breakdown.map((b) => `- ${b}`).join('\n')}`;
  } else if (type === 'analyze-diff') {
    const analysis = data as AnalyzeDiffOutput;
    content += `**Summary of Changes:**\n${analysis.summary}\n\n**Detailed Analysis:**\n${analysis.detailedAnalysis.map((p) => `- ${p}`).join('\n')}`;
  } else if (type === 'bugs') {
    const bugReport = data as FindBugsOutput;
    content += `**Bugs Found:**\n${bugReport.bugs.map((b) => `- ${b}`).join('\n')}\n\n**Explanation & Fixes:**\n${bugReport.explanation}`;
  } else if (type === 'refactor') {
    const refactorData = data as RefactorCodeOutput;
    content += `**Refactored Code:**\n\`\`\`${language}\n${refactorData.refactoredCode}\n\`\`\`\n\n**Explanation:**\n${refactorData.explanation}`;
  } else if (type === 'test') {
    const testData = data as GenerateUnitTestOutput;
    content += `**Generated Unit Test:**\n\`\`\`${language}\n${testData.unitTest}\n\`\`\``;
  } else if (type === 'docs') {
    const docsData = data as GenerateCodeDocsOutput;
    content += `**Generated Comments:**\n\`\`\`${language}\n${docsData.documentation}\n\`\`\``;
  } else if (type === 'sdd') {
    const sddData = data as GenerateSddOutput;
    content += `**Software Design Document:**\n${sddData.sdd}`;
  }
  return content;
};

const renderOutput = (output: AIOutput) => {
  const { data, type, language } = output;

  if (type === 'explain') {
    const explanation = data as ExplainCodeOutput;
    return (
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2">Summary</h4>
          <p className="text-muted-foreground whitespace-pre-wrap">{explanation.summary}</p>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Breakdown</h4>
          {explanation.breakdown.length > 0 ? (
            <ul className="list-disc list-inside space-y-2 bg-muted/50 p-4 rounded-md">
              {explanation.breakdown.map((point, index) => <li key={index}>{point}</li>)}
            </ul>
          ) : (
            <p className="text-muted-foreground">No breakdown available.</p>
          )}
        </div>
      </div>
    );
  }

  if (type === 'analyze-diff') {
    const analysis = data as AnalyzeDiffOutput;
    return (
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2">Summary of Changes:</h4>
          <p className="text-muted-foreground whitespace-pre-wrap">{analysis.summary}</p>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Detailed Analysis:</h4>
          {analysis.detailedAnalysis.length > 0 ? (
              <ul className="list-disc list-inside space-y-2 bg-muted/50 p-4 rounded-md">
                  {analysis.detailedAnalysis.map((point, index) => <li key={index}>{point}</li>)}
              </ul>
          ) : <p className="text-muted-foreground">No specific issues found.</p>}
        </div>
      </div>
    );
  }

  if (type === 'bugs') {
    const bugReport = data as FindBugsOutput;
    return (
      <>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Bugs Found:</h4>
            {bugReport.bugs.length > 0 ? (
                <ul className="list-disc list-inside space-y-1 bg-muted/50 p-3 rounded-md">
                    {bugReport.bugs.map((bug, index) => <li key={index}>{bug}</li>)}
                </ul>
            ) : <p className="text-muted-foreground">No bugs found.</p>}
          </div>
          <div>
            <h4 className="font-semibold mb-2">Explanation & Fixes:</h4>
            <p className="text-muted-foreground whitespace-pre-wrap">{bugReport.explanation}</p>
          </div>
        </div>
      </>
    );
  }

  if (type === 'refactor') {
    const refactorData = data as RefactorCodeOutput;
    return (
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2">Refactored Code:</h4>
          <CodeBlock code={refactorData.refactoredCode} language={language} />
        </div>
        <div>
          <h4 className="font-semibold mb-2">Explanation:</h4>
          <p className="text-muted-foreground whitespace-pre-wrap">{refactorData.explanation}</p>
        </div>
      </div>
    );
  }

  if (type === 'test') {
    const testData = data as GenerateUnitTestOutput;
    return <CodeBlock code={testData.unitTest} language={language} />;
  }

  if (type === 'docs') {
    const docsData = data as GenerateCodeDocsOutput;
    return <CodeBlock code={docsData.documentation} language={language} />;
  }
  
  if (type === 'sdd') {
    const sddData = data as GenerateSddOutput;
    return <CodeBlock code={sddData.sdd} language={language} />;
  }

  return <p className="whitespace-pre-wrap">{String(data)}</p>;
};

export function AIOutputPanel({ 
  output, 
  isLoading, 
  messages, 
  onMessagesChange, 
  isChatLoading,
  setIsChatLoading,
}: AIOutputPanelProps) {
  const [input, setInput] = useState('');
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !output) {
        return;
    }

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    onMessagesChange(newMessages);
    setInput('');
    setIsChatLoading(true);

    try {
      const modelConfig = await getDefaultModel();
      if (!modelConfig) {
        toast({
          variant: 'destructive',
          title: 'No Default Model Set',
          description: 'An administrator needs to set a default AI model in the settings.',
        });
        setIsChatLoading(false);
        return;
      }
      const model = `googleai/${modelConfig.name}`;

      const projectContext = output.fileContext ? `The user is discussing an analysis on the file "${output.fileContext.name}".` : 'No file context provided.';
      const discussionContext = formatAiOutputForChat(output);
      
      const firstUserMessageIndex = newMessages.findIndex(m => m.role === 'user');
      const historyForApi = firstUserMessageIndex !== -1 ? newMessages.slice(firstUserMessageIndex) : [];

      const stream = await copilotChat({
        model,
        messages: historyForApi,
        projectContext,
        discussionContext,
      });

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let isFirstChunk = true;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunkValue = decoder.decode(value);

        if (chunkValue) {
          if (isFirstChunk) {
            onMessagesChange(prev => [...prev, { role: 'model', content: chunkValue }]);
            isFirstChunk = false;
          } else {
            onMessagesChange(prev => {
              const updatedMessages = [...prev];
              const lastMessage = updatedMessages[updatedMessages.length - 1];
              if (lastMessage?.role === 'model') {
                updatedMessages[updatedMessages.length - 1] = {
                  ...lastMessage,
                  content: lastMessage.content + chunkValue,
                };
              }
              return updatedMessages;
            });
          }
        }
      }

    } catch (error) {
      console.error('Chat failed:', error);
      toast({
        variant: 'destructive',
        title: 'Chat Error',
        description: 'Could not get a response from the AI model. Please check your model configuration and try again.',
      });
      const errorMessage: Message = { role: 'model', content: "Sorry, I encountered an error. Please try again." };
      onMessagesChange([...newMessages, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };
  
  return (
    <Card className="h-full flex flex-col bg-card/50 shadow-lg">
      <CardHeader className="flex-shrink-0 border-b p-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-accent" />
          <span>AI Assistant</span>
        </CardTitle>
        {output && output.fileContext && (
          <p className="text-xs text-muted-foreground pt-1 truncate" title={output.fileContext.name}>
            on {output.fileContext.name}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-0 flex flex-col min-h-0">
        <ScrollArea className="flex-1" ref={scrollAreaRef}>
          <div className="p-4">
            {isLoading && (
              <div className="space-y-4">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-16 w-full" />
              </div>
            )}
            {!isLoading && !output && (
              <div className="text-center text-muted-foreground h-full flex flex-col justify-center items-center py-16">
                <p>Select an AI action to see the results here.</p>
                <p className="text-xs mt-2">e.g., Explain, Find Bugs, Refactor Code</p>
              </div>
            )}
            {!isLoading && output && output.type !== 'completion' && (
              <div>
                <h3 className="font-medium mb-3 text-accent">{output.title}</h3>
                {renderOutput(output)}
              </div>
            )}
          </div>
          
          {messages.length > 0 && <Separator className="my-0" />}

          <div className="space-y-6 p-4">
            {messages.map((message, index) => (
              <div key={index} className={cn('flex items-start gap-3 w-full', message.role === 'user' && 'justify-end')}>
                {message.role === 'model' && (
                  <Avatar className="h-8 w-8 border bg-background flex-shrink-0">
                    <AvatarFallback className="bg-transparent"><LogoMark /></AvatarFallback>
                  </Avatar>
                )}
                <div className={cn(
                    'p-3 rounded-lg max-w-[85%] text-sm break-words', 
                    message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}>
                  {message.role === 'model' ? <MessageContent content={message.content} /> : <p className="whitespace-pre-wrap">{message.content}</p>}
                </div>
                {message.role === 'user' && (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback><User className="h-5 w-5"/></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isChatLoading && (messages.length === 0 || messages[messages.length-1].role === 'user') && (
              <div className="flex items-start gap-3">
                 <Avatar className="h-8 w-8 border bg-background flex-shrink-0">
                    <AvatarFallback className="bg-transparent"><LogoMark /></AvatarFallback>
                  </Avatar>
                <div className="p-3 rounded-lg bg-muted flex items-center">
                    <Loader2 className="h-5 w-5 animate-spin"/>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
       {output && !isLoading && (
        <CardFooter className="p-4 border-t">
          <form onSubmit={handleSubmit} className="flex gap-2 w-full">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a follow-up about the result..."
              disabled={isChatLoading}
            />
            <Button type="submit" disabled={!input.trim() || isChatLoading} size="icon">
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </CardFooter>
      )}
    </Card>
  );
}
