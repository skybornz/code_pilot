'use client';

import type { CodeFile } from '@/components/codepilot/types';
import { BookText, Bug, TestTube2, Wand2, NotebookText } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ActionType } from './types';

interface EditorPanelProps {
  file: CodeFile;
  onCodeChange: (fileId: string, newContent: string) => void;
  onAiAction: (action: ActionType, code: string, language: string) => void;
  onCompletion: (code: string, language: string) => void;
  isLoading: boolean;
  completion: string | null;
  onAcceptCompletion: (completion: string) => void;
  onDismissCompletion: () => void;
}

export function EditorPanel({
  file,
  onCodeChange,
  onAiAction,
  onCompletion,
  isLoading,
  completion,
  onAcceptCompletion,
  onDismissCompletion
}: EditorPanelProps) {
  const [code, setCode] = useState(file.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCode(file.content);
  }, [file]);
  
  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setCode(newCode);
    onCodeChange(file.id, newCode);
  };
  
  const debouncedCompletion = useCallback(
    debounce((newCode: string, lang: string) => {
      onCompletion(newCode, lang);
    }, 1000),
    [onCompletion]
  );
  
  useEffect(() => {
    if (code !== file.content) { // to avoid triggering on initial load
        debouncedCompletion(code, file.language);
    }
  }, [code, file.language, debouncedCompletion, file.content]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && completion) {
      e.preventDefault();
      onAcceptCompletion(completion);
    }
  };

  const actions: { id: ActionType; label: string; icon: React.ElementType }[] = [
    { id: 'explain', label: 'Explain Code', icon: BookText },
    { id: 'refactor', label: 'Refactor Code', icon: Wand2 },
    { id: 'bugs', label: 'Find Bugs', icon: Bug },
    { id: 'test', label: 'Generate Unit Test', icon: TestTube2 },
    { id: 'docs', label: 'Generate Docs', icon: NotebookText },
  ];

  return (
    <Card className="h-full flex flex-col bg-card/50 shadow-lg">
      <CardHeader className="flex-row items-center justify-between border-b p-4">
        <CardTitle className="text-lg">{file.name}</CardTitle>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            {actions.map((action) => (
              <Tooltip key={action.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onAiAction(action.id, code, file.language)}
                    disabled={isLoading}
                    aria-label={action.label}
                  >
                    <action.icon className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{action.label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 flex flex-col min-h-0">
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={code}
            onChange={handleCodeChange}
            onKeyDown={handleKeyDown}
            className="w-full h-full p-4 resize-none border-0 rounded-none bg-transparent font-code text-base focus-visible:ring-0"
            placeholder="Enter your code here..."
            aria-label={`Code editor for ${file.name}`}
          />
        </div>
        {completion && (
          <div className="p-4 border-t bg-background/50">
            <h3 className="text-sm font-semibold mb-2">AI Suggestion (Press Tab to accept)</h3>
            <pre className="bg-muted p-3 rounded-md text-sm font-code whitespace-pre-wrap">{completion}</pre>
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={() => onAcceptCompletion(completion)}>Accept</Button>
              <Button size="sm" variant="ghost" onClick={onDismissCompletion}>Dismiss</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise(resolve => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
}
