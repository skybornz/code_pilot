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
    if (messages.length === 0) {
      setMessages([
        { role: 'model', content: "Hello! I'm W.A.I.K.I. How can I help you today?" }
      ]);
    }
  }, [messages.length]);

  useEffect(() => {
    setInitialMessage();
  }, [setInitialMessage]);

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
    const newMessagesForApi = [...messages, userMessage];
    
    setMessages(newMessagesForApi); // Update UI with user's message
    setInput('');
    setIsChatLoading(true);

    try {
      const firstUserMessageIndex = newMessagesForApi.findIndex(m => m.role === 'user');
      const historyForApi = firstUserMessageIndex !== -1 ? newMessagesForApi.slice(firstUserMessageIndex) : [];
      
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
                // On the first chunk, add a new message bubble for the model's response.
                setMessages(prev => [...prev, { role: 'model', content: chunkValue }]);
                isFirstChunk = false;
            } else {
                // For subsequent chunks, append the text to the last message.
                setMessages(prev => {
                    const updatedMessages = [...prev];
                    const lastMessage = updatedMessages[updatedMessages.length - 1];
                    if (lastMessage?.role === 'model') {
                        // Create a new object for the last message to ensure immutability and trigger a re-render.
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
       setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };
  
  const hasStartedChat = messages.length > 1;

  return (
    <div className={cn(
      "h-full flex flex-col items-center",
      hasStartedChat ? 'justify-between' : 'justify-center'
    )}>
       <div className={cn(
          "w-full flex flex-col",
          hasStartedChat ? 'flex-1 min-h-0' : 'max-w-4xl'
      )}>
        <ScrollArea className={cn(hasStartedChat && "flex-1")} ref={scrollAreaRef}>
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
        
        <div className={cn(
          "w-full px-4 pb-4 md:px-6 md:pb-6 flex-shrink-0",
           hasStartedChat ? 'bg-background/80 backdrop-blur-sm' : 'bg-transparent',
        )}>
           <div className="max-w-4xl mx-auto">
              <form onSubmit={handleSubmit} className="flex gap-2 w-full bg-muted/80 p-2 rounded-full border">
                  <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask W.A.I.K.I anything..."
                      disabled={isChatLoading}
                      className="h-12 text-base bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <Button type="submit" disabled={isChatLoading || !input.trim()} size="icon" className="h-12 w-12 rounded-full">
                      <Send className="h-5 w-5" />
                      <span className="sr-only">Send</span>
                  </Button>
              </form>
            </div>
        </div>
      </div>
    </div>
  );
}
