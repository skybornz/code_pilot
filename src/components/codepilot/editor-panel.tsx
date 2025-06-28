'use client';

import type { CodeFile } from '@/components/codepilot/types';
import { BookText, Bug, TestTube2, Wand2, NotebookText, FileText, GitCompare, Sparkles } from 'lucide-react';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ActionType } from './types';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { python } from '@codemirror/lang-python';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';

interface EditorPanelProps {
  file: CodeFile;
  onCodeChange: (fileId: string, newContent: string) => void;
  onAiAction: (action: ActionType, code: string, language: string, originalCode?: string) => void;
  onCompletion: (code: string, language: string) => void;
  isLoading: boolean;
  completion: string | null;
  onAcceptCompletion: (completion: string) => void;
  onDismissCompletion: () => void;
}

const getLanguageExtension = (language: string) => {
  switch (language.toLowerCase()) {
    case 'javascript':
    case 'typescript':
    case 'tsx':
    case 'jsx':
      return [javascript({ jsx: true, typescript: true })];
    case 'css':
      return [css()];
    case 'python':
      return [python()];
    default:
      // Fallback for languages like json, html, etc.
      return [javascript({ jsx: true, typescript: true })];
  }
};

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
  const [viewMode, setViewMode] = useState<'edit' | 'diff'>('edit');

  useEffect(() => {
    setCode(file.content);
    setViewMode('edit'); // Reset to edit mode when file changes
  }, [file]);
  
  const handleCodeMirrorChange = (value: string) => {
    setCode(value);
    onCodeChange(file.id, value);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab' && completion) {
      e.preventDefault();
      onAcceptCompletion(completion);
    }
  };

  const langExtension = useMemo(() => getLanguageExtension(file.language), [file.language]);
  const hasChanges = file.originalContent !== undefined && file.content !== file.originalContent;


  const actions: { id: ActionType; label: string; icon: React.ElementType }[] = [
    { id: 'explain', label: 'Explain Code', icon: BookText },
    { id: 'refactor', label: 'Refactor Code', icon: Wand2 },
    { id: 'bugs', label: 'Find Bugs', icon: Bug },
    { id: 'test', label: 'Generate Unit Test', icon: TestTube2 },
    { id: 'docs', label: 'Generate Docs', icon: NotebookText },
    { id: 'sdd', label: 'Generate SDD', icon: FileText },
  ];

  return (
    <Card className="h-full flex flex-col bg-card/50 shadow-lg">
      <CardHeader className="flex-row items-center justify-between border-b p-4">
        <CardTitle className="text-lg">{file.name}</CardTitle>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode(viewMode === 'edit' ? 'diff' : 'edit')}
                  disabled={!hasChanges}
                  data-active={viewMode === 'diff'}
                  className="data-[active=true]:bg-accent"
                  aria-label="View Changes"
                >
                  <GitCompare className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View Changes</p>
              </TooltipContent>
            </Tooltip>
            {viewMode === 'diff' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onAiAction('analyze-diff', code, file.language, file.originalContent)}
                    disabled={isLoading}
                    aria-label="Analyze Changes"
                  >
                    <Sparkles className="h-5 w-5 text-accent" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Analyze Changes</p>
                </TooltipContent>
              </Tooltip>
            )}

            <div className="w-[1px] h-6 bg-border mx-1"></div>

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
        <div className="relative flex-1 overflow-y-auto" onKeyDown={handleKeyDown}>
          {viewMode === 'edit' ? (
            <CodeMirror
              value={code}
              height="100%"
              theme={vscodeDark}
              extensions={langExtension}
              onChange={handleCodeMirrorChange}
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                autocompletion: false,
              }}
              className="h-full"
              style={{
                fontSize: '0.875rem', // equiv to text-sm
                fontFamily: 'var(--font-code)',
              }}
            />
          ) : (
            <div className="flex-1 flex flex-row gap-2 p-2 min-h-0 h-full">
                <div className="flex-1 flex flex-col">
                    <h3 className="text-sm font-semibold mb-2 text-center text-muted-foreground">Original</h3>
                    <div className="flex-1 rounded-md overflow-hidden border">
                        <CodeMirror
                            value={file.originalContent || ''}
                            height="100%"
                            theme={vscodeDark}
                            extensions={langExtension}
                            readOnly={true}
                            basicSetup={{
                                lineNumbers: true,
                                foldGutter: true,
                                autocompletion: false,
                                editable: false,
                            }}
                            className="h-full"
                             style={{
                                fontSize: '0.875rem',
                                fontFamily: 'var(--font-code)',
                            }}
                        />
                    </div>
                </div>
                <div className="flex-1 flex flex-col">
                    <h3 className="text-sm font-semibold mb-2 text-center text-muted-foreground">Modified</h3>
                    <div className="flex-1 rounded-md overflow-hidden border">
                        <CodeMirror
                            value={code}
                            height="100%"
                            theme={vscodeDark}
                            extensions={langExtension}
                            readOnly={true}
                            basicSetup={{
                                lineNumbers: true,
                                foldGutter: true,
                                autocompletion: false,
                                editable: false,
                            }}
                            className="h-full"
                             style={{
                                fontSize: '0.875rem',
                                fontFamily: 'var(--font-code)',
                            }}
                        />
                    </div>
                </div>
            </div>
          )}
        </div>
        {completion && viewMode === 'edit' && (
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
