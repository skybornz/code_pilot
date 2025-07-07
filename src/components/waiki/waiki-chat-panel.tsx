
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { streamWaikiChat } from '@/actions/ai';
import type { Message as WaikiMessage } from '@/ai/flows/waiki-chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, User, Loader2 } from 'lucide-react';
import { LogoMark } from '@/components/codepilot/logo-mark';
import { cn } from '@/lib/utils';
import { MessageContent } from '@/components/codepilot/message-content';

type Message = {
  role: 'user' | 'model';
  content: string;
};

export function WaikiChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [input, setInput] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages or streaming response changes
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, streamingResponse]);

  const handleSend = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !user || isChatLoading) return;

    const currentInput = input;
    const userMessage: WaikiMessage = { role: 'user', content: currentInput };
    const newMessages: WaikiMessage[] = [...messages, userMessage];

    setMessages(newMessages);
    setInput('');
    setIsChatLoading(true);
    setStreamingResponse('');

    try {
      const stream = await streamWaikiChat(user.id, newMessages);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunkValue = decoder.decode(value);
        setStreamingResponse(prev => prev + chunkValue);
      }
    } catch (error) {
      console.error('Chat failed:', error);
      toast({
        variant: 'destructive',
        title: 'Chat Error',
        description: 'Could not get a response from the AI model. Please check your model configuration.',
      });
      setStreamingResponse('Sorry, I encountered an error.');
    } finally {
      setIsChatLoading(false);
    }
  }, [input, user, isChatLoading, messages, toast]);

  // Effect to commit the streaming response to the messages list when done
  useEffect(() => {
    if (!isChatLoading && streamingResponse) {
      setMessages(prev => [...prev, { role: 'model', content: streamingResponse }]);
      setStreamingResponse('');
    }
  }, [isChatLoading, streamingResponse]);

  const hasContent = messages.length > 0 || streamingResponse;

  return (
    <div
      className={cn(
        'h-full flex flex-col',
        !hasContent && 'items-center justify-center'
      )}
    >
      {hasContent ? (
        <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
          <div className="space-y-6 max-w-3xl mx-auto w-full py-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn('flex items-start gap-4', message.role === 'user' && 'justify-end')}
              >
                {message.role === 'model' && (
                  <Avatar className="h-9 w-9 border bg-background flex-shrink-0">
                    <AvatarFallback className="bg-transparent">
                      <LogoMark />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    'p-3 rounded-lg max-w-[85%]',
                    'text-sm break-words',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <MessageContent content={message.content} />
                </div>
                {message.role === 'user' && (
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isChatLoading && (
              <div className="flex items-start gap-3">
                 <Avatar className="h-9 w-9 border bg-background flex-shrink-0">
                    <AvatarFallback className="bg-transparent"><LogoMark /></AvatarFallback>
                  </Avatar>
                <div className={cn(
                    'p-3 rounded-lg max-w-[85%]',
                    'text-sm break-words bg-muted'
                  )}>
                    {streamingResponse ? (
                      <MessageContent content={streamingResponse} />
                    ) : (
                      <Loader2 className="h-5 w-5 animate-spin"/>
                    )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-4xl font-medium tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Hello, {user?.email.split('@')[0]}
          </h1>
          <p className="text-lg text-muted-foreground">How can I help you today?</p>
        </div>
      )}

      <div
        className={cn(
          'w-full flex-shrink-0 px-4 pb-4 pt-2',
          hasContent ? 'mt-auto' : 'mt-8'
        )}
      >
        <form
          onSubmit={handleSend}
          className="max-w-3xl mx-auto w-full flex gap-2 p-2 rounded-full bg-card border"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask W.A.I.K.I anything..."
            className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0"
            disabled={isChatLoading}
          />
          <Button type="submit" size="icon" className="rounded-full" disabled={isChatLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
