
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Wand2, Send, User, Loader2, CheckCircle, Circle } from 'lucide-react';
import type { AIOutput } from './types';
import { Button } from '../ui/button';
import type { Message } from '@/ai/flows/copilot-chat';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogoMark } from './logo-mark';
import { cn } from '@/lib/utils';
import { MessageContent } from './message-content';
import { Separator } from '../ui/separator';
import { useAuth } from '@/context/auth-context';
import { streamCopilotChat } from '@/actions/ai';
import { usePathname } from 'next/navigation';
import { Textarea } from '../ui/textarea';

interface AIOutputPanelProps {
  output: AIOutput | null;
  isLoading: boolean;
  messages: Message[];
  onMessagesChange: React.Dispatch<React.SetStateAction<Message[]>>;
  isChatLoading: boolean;
  setIsChatLoading: (isLoading: boolean) => void;
}

const formatAiOutputForChat = (output: AIOutput): string => {
  // For 'test' type, data is already a string. For others, it's also a string.
  return `Regarding your previous analysis on "${output.title}":\n\n${output.data}`;
};


const AIActionLoader = () => {
  const steps = [
    'Connecting to AI model...',
    'Analyzing code context...',
    'Generating insights...',
    'Finalizing response...',
  ];
  const [currentStep, setCurrentStep] = useState(0);
  const pathname = usePathname();
  const accentColorClass = pathname.startsWith('/codepilot') ? 'text-blue-400' : 'text-purple-400';

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        clearInterval(interval);
        return prev;
      });
    }, 1200); // Simulate progress every 1.2 seconds

    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="space-y-4 p-4 rounded-lg bg-muted/50">
      <h4 className={`font-semibold text-center ${accentColorClass} animate-pulse`}>AI is thinking...</h4>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center gap-3 text-sm">
            <div>
              {index < currentStep ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : index === currentStep ? (
                <Loader2 className={`h-5 w-5 animate-spin ${accentColorClass}`} />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground/50" />
              )}
            </div>
            <span
              className={cn(
                'transition-colors duration-300',
                index < currentStep ? 'text-muted-foreground line-through' : '',
                index === currentStep ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}
            >
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
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
  const { user } = useAuth();
  const pathname = usePathname();
  
  const themeColorClass = pathname.startsWith('/codepilot') ? 'text-blue-400' : 'text-purple-400';
  const accentColorClass = pathname.startsWith('/codepilot') ? 'text-blue-400' : 'text-accent';
  const buttonClass = pathname.startsWith('/codepilot') ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700';


  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, output]); // Scroll on new messages or new initial output

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !output || !user) {
        return;
    }

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    onMessagesChange(newMessages);
    setInput('');
    setIsChatLoading(true);

    try {
      const projectContext = output.fileContext ? `The user is discussing an analysis on the file "${output.fileContext.name}".` : 'No file context provided.';
      const discussionContext = formatAiOutputForChat(output);
      
      const firstUserMessageIndex = newMessages.findIndex(m => m.role === 'user');
      const historyForApi = firstUserMessageIndex !== -1 ? newMessages.slice(firstUserMessageIndex) : [];

      const stream = await streamCopilotChat(
        user.id,
        historyForApi,
        projectContext,
        discussionContext
      );

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
            onMessagesChange((prev: Message[]) => [...prev, { role: 'model', content: chunkValue }]);
            isFirstChunk = false;
          } else {
            onMessagesChange((prev: Message[]) => {
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
  
  const handleCopyAndScroll = () => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  return (
    <Card className="h-full flex flex-col bg-card/50 shadow-lg">
      <CardHeader className="flex-shrink-0 border-b p-4">
        <CardTitle className={`text-base font-semibold flex items-center gap-2 ${themeColorClass}`}>
          <Wand2 className={`h-5 w-5 ${accentColorClass}`} />
          <span>{output ? output.title : 'AI Assistant'}</span>
        </CardTitle>
        {output && output.fileContext && (
          <p className="text-xs text-muted-foreground pt-1 truncate" title={output.fileContext.name}>
            on {output.fileContext.name}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-0 flex flex-col min-h-0">
          <ScrollArea className="flex-1" ref={scrollAreaRef}>
            <div className="p-4 space-y-4">
              {isLoading && <AIActionLoader />}

              {!isLoading && !output && (
                <div className="text-center text-muted-foreground h-full flex flex-col justify-center items-center py-16">
                    <p>Select an AI action to see the results here.</p>
                    <p className="text-xs mt-2">e.g., Explain, Find Bugs, Refactor Code</p>
                </div>
              )}
              
              {/* Main AI output */}
              {!isLoading && output && (
                <div>
                    <MessageContent content={output.data} onCopy={handleCopyAndScroll} />
                </div>
              )}
          
              {/* Follow-up chat messages */}
              {messages.length > 0 && output && <Separator />}

              {messages.map((message, index) => (
              <div key={index} className={cn('flex items-start gap-3 w-full', message.role === 'user' && 'justify-end')}>
                  {message.role === 'model' && (
                  <Avatar className="h-8 w-8 border bg-background flex-shrink-0">
                      <AvatarFallback className="bg-transparent"><LogoMark className={themeColorClass} /></AvatarFallback>
                  </Avatar>
                  )}
                  <div className={cn(
                      'p-3 rounded-lg max-w-[85%]', 
                      'text-sm break-words', 
                      message.role === 'user' ? `${buttonClass} text-primary-foreground` : 'bg-muted'
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
                      <AvatarFallback className="bg-transparent"><LogoMark className={themeColorClass} /></AvatarFallback>
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
        <CardFooter className="p-4 border-t flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex items-start gap-2 w-full">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a follow-up about the result..."
              disabled={isChatLoading}
              className="min-h-[40px] max-h-[120px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                }
              }}
            />
            <Button type="submit" disabled={!input.trim() || isChatLoading} size="icon" className={buttonClass}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </CardFooter>
      )}
    </Card>
  );
}
