'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, User, Loader2, Wand2 } from 'lucide-react';
import { copilotChat, type CopilotChatInput, type Message } from '@/ai/flows/copilot-chat';
import type { CodeFile } from './types';
import { useToast } from '@/hooks/use-toast';
import { LogoMark } from './logo-mark';
import { cn } from '@/lib/utils';
import { CodeBlock } from './code-block';

/**
 * A component that intelligently renders chat message content.
 * It detects markdown code blocks and renders them with proper styling,
 * while displaying regular text normally.
 */
const MessageContent = ({ content }: { content: string }) => {
    // Regex to split content by markdown-style code blocks, keeping the delimiters.
    const parts = content.split(/(```[\w-]*\n[\s\S]*?\n```)/g);

    // If no code blocks are found, render as a single block of text.
    if (parts.length <= 1) {
        return <p className="whitespace-pre-wrap">{content}</p>;
    }

    return (
        <div className="space-y-4">
            {parts.map((part, index) => {
                // Don't render empty strings that can result from the split.
                if (!part.trim()) return null;

                const codeBlockMatch = part.match(/```([\w-]*)\n([\s\S]*?)\n```/);

                if (codeBlockMatch) {
                    const language = codeBlockMatch[1] || 'text';
                    const code = codeBlockMatch[2].trim();
                    // Use the dedicated CodeBlock component for syntax highlighting and styling.
                    return <CodeBlock key={index} code={code} language={language} />;
                } else {
                    // Render plain text parts, preserving whitespace.
                    return <p key={index} className="whitespace-pre-wrap">{part}</p>;
                }
            })}
        </div>
    );
};

interface CopilotChatPanelProps {
  activeFile: CodeFile | null;
  initialMessages?: Message[];
  discussionContext?: string;
}

export function CopilotChatPanel({ activeFile, initialMessages, discussionContext }: CopilotChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(
    initialMessages || [
      { role: 'model', content: "Hello! I'm SemCo-Pilot. How can I help you with your code today?" }
    ]
  );
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const isInitialConversation = useRef(!!initialMessages);

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
    if (!currentInput.trim() && !isInitialConversation.current) return;
    
    let userMessage: Message | null = null;
    let newMessages: Message[];

    if (isInitialConversation.current) {
      // For the first message in a follow-up, the messages are already set
      newMessages = messages;
    } else {
      userMessage = { role: 'user', content: currentInput };
      newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput('');
    }

    setIsLoading(true);

    try {
      const projectContext = activeFile ? `The user is currently viewing the file "${activeFile.name}" with the following content:\n\n${activeFile.content}` : 'No file is currently active.';
      
      const firstUserMessageIndex = newMessages.findIndex(m => m.role === 'user');
      const historyForApi = firstUserMessageIndex !== -1 ? newMessages.slice(firstUserMessageIndex) : [];
      
      const stream = await copilotChat({
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
                // On the first chunk, create a new message bubble for the model's response.
                setMessages(prev => [...prev, { role: 'model', content: chunkValue }]);
                isFirstChunk = false;
            } else {
                // For subsequent chunks, append the text to the last message.
                setMessages(prev => {
                    const updatedMessages = [...prev];
                    const lastMessage = updatedMessages[updatedMessages.length - 1];
                    if (lastMessage?.role === 'model') {
                        // Create a new object for the last message to ensure immutability
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
        title: 'Error',
        description: 'The chat feature failed. Please try again.',
      });
       const errorMessage: Message = { role: 'model', content: "Sorry, I encountered an error. Please try again." };
       setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      isInitialConversation.current = false;
    }
  };

  useEffect(() => {
    if (isInitialConversation.current) {
      handleSubmit();
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="h-full flex flex-col bg-card/50 shadow-lg">
      <CardHeader className="flex-shrink-0 border-b p-4 flex flex-row items-center">
        <CardTitle className="text-lg flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-accent" />
          <span>Co-Pilot Chat</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 flex flex-col min-h-0">
        <ScrollArea className="flex-1" ref={scrollAreaRef}>
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
            {/* Show a loading spinner only when waiting for the first chunk of a new response. */}
            {isLoading && (messages.length === 0 || messages[messages.length-1].role === 'user') && (
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
