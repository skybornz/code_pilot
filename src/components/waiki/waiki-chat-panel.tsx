'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, User, Loader2 } from 'lucide-react';
import type { Message } from '@/ai/flows/waiki-chat';
import { useToast } from '@/hooks/use-toast';
import { LogoMark } from '@/components/codepilot/logo-mark';
import { cn } from '@/lib/utils';
import { MessageContent } from '@/components/codepilot/message-content';
import { useAuth } from '@/context/auth-context';
import { streamWaikiChat } from '@/actions/ai';

export function WaikiChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const setInitialMessage = useCallback(() => {
    setMessages([
      { role: 'model', content: "Hello! I'm W.A.I.K.I. How can I help you today?" }
    ]);
  }, []);

  useEffect(() => {
    setInitialMessage();
  }, [setInitialMessage]);

  // Auto-scroll to the bottom when new messages are added.
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const currentInput = input;
    if (!currentInput.trim() || !user) return;

    const userMessage: Message = { role: 'user', content: currentInput };
    const newMessages: Message[] = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsChatLoading(true);

    try {
      const firstUserMessageIndex = newMessages.findIndex(m => m.role === 'user');
      const historyForApi = firstUserMessageIndex !== -1 ? newMessages.slice(firstUserMessageIndex) : [];
      
      const stream = await streamWaikiChat(user.id, historyForApi);

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
                setMessages(prev => [...prev, { role: 'model', content: chunkValue }]);
                isFirstChunk = false;
            } else {
                setMessages(prev => {
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
       setMessages([...newMessages, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 p-0 flex flex-col min-h-0">
        <ScrollArea className="flex-1" ref={scrollAreaRef}>
          <div className="space-y-8 p-4 md:p-6">
            {messages.map((message, index) => (
              <div key={index} className={cn('flex items-start gap-4 w-full', message.role === 'user' && 'justify-end')}>
                {message.role === 'model' && (
                  <Avatar className="h-9 w-9 border bg-background flex-shrink-0">
                    <AvatarFallback className="bg-transparent"><LogoMark /></AvatarFallback>
                  </Avatar>
                )}
                <div className={cn(
                    'p-4 rounded-lg max-w-xl shadow-md', 
                    'text-base break-words', 
                    message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}>
                  <MessageContent content={message.content} />
                </div>
                {message.role === 'user' && (
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarFallback><User className="h-5 w-5"/></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isChatLoading && (messages.length === 0 || messages[messages.length-1].role === 'user') && (
              <div className="flex items-start gap-4">
                 <Avatar className="h-9 w-9 border bg-background flex-shrink-0">
                    <AvatarFallback className="bg-transparent"><LogoMark /></AvatarFallback>
                  </Avatar>
                <div className="p-4 rounded-lg bg-muted flex items-center shadow-md">
                    <Loader2 className="h-5 w-5 animate-spin"/>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="border-t p-4 flex-shrink-0 bg-background/50">
          <form onSubmit={handleSubmit} className="flex gap-2 w-full">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask W.A.I.K.I anything..."
              disabled={isChatLoading}
              className="h-12 text-base"
            />
            <Button type="submit" disabled={isChatLoading || !input.trim()} size="lg">
              <Send className="h-5 w-5" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
