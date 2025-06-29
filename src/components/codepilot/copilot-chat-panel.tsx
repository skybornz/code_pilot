'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, User, Loader2, Wand2 } from 'lucide-react';
import { copilotChat, type CopilotChatInput } from '@/ai/flows/copilot-chat';
import type { CodeFile } from './types';
import { useToast } from '@/hooks/use-toast';
import { LogoMark } from './logo-mark';
import { cn } from '@/lib/utils';

type Message = CopilotChatInput['messages'][0];

interface CopilotChatPanelProps {
  activeFile: CodeFile | null;
}

export function CopilotChatPanel({ activeFile }: CopilotChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: "Hello! I'm SemCo-Pilot. How can I help you with your code today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const projectContext = activeFile ? `The user is currently viewing the file "${activeFile.name}" with the following content:\n\n${activeFile.content}` : 'No file is currently active.';
      
      const fullHistory = [...messages, userMessage];
      // The API requires the conversation to start with a user message.
      // We find the first user message and slice the array from there to create a valid history for the API.
      const firstUserMessageIndex = fullHistory.findIndex(m => m.role === 'user');
      const messagesForApi = firstUserMessageIndex !== -1 ? fullHistory.slice(firstUserMessageIndex) : [];
      
      const { response } = await copilotChat({
        messages: messagesForApi,
        projectContext,
      });
      const modelMessage: Message = { role: 'model', content: response };
      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error('Chat failed:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'The chat feature failed. Please try again.',
      });
       const errorMessage: Message = { role: 'model', content: "Sorry, I encountered an error. Please try again." };
       setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-full flex flex-col bg-card/50 shadow-lg">
      <CardHeader className="flex-shrink-0 border-b p-4 flex flex-row items-center">
        <CardTitle className="text-lg flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-accent" />
          <span>Co-Pilot Chat</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 flex flex-col min-h-0">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div key={index} className={cn('flex items-start gap-3', message.role === 'user' && 'justify-end')}>
                {message.role === 'model' && (
                  <Avatar className="h-8 w-8 border bg-background">
                    <AvatarFallback className="bg-transparent"><LogoMark /></AvatarFallback>
                  </Avatar>
                )}
                <div className={cn(
                    'p-3 rounded-lg max-w-[80%] whitespace-pre-wrap text-sm', 
                    message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}>
                  {message.content}
                </div>
                {message.role === 'user' && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback><User className="h-5 w-5"/></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-3">
                 <Avatar className="h-8 w-8 border bg-background">
                    <AvatarFallback className="bg-transparent"><LogoMark /></AvatarFallback>
                  </Avatar>
                <div className="p-3 rounded-lg bg-muted flex items-center">
                    <Loader2 className="h-5 w-5 animate-spin"/>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="border-t p-4 flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about your code..."
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
