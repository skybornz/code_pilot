'use client';

import type { CodeFile } from '@/components/codepilot/types';
import { BookText, Bug, TestTube2, Wand2, NotebookText, FileText, GitCompare, Sparkles, GitCommit, MoreVertical } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';
import { diffLines, type Change } from 'diff';
import { Decoration, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { RangeSet, RangeSetBuilder } from '@codemirror/state';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


interface EditorPanelProps {
  file: CodeFile;
  onCodeChange: (fileId: string, newContent: string) => void;
  onAiAction: (action: ActionType, code: string, language: string, originalCode?: string) => void;
  onCompletion: (code: string, language: string) => void;
  isLoading: boolean;
  completion: string | null;
  onAcceptCompletion: (completion: string) => void;
  onDismissCompletion: () => void;
  onCommitChange: (fileId: string, commitHash: string) => void;
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

// Creates a CodeMirror extension that highlights lines based on a provided class list.
function lineHighlighter(lineClasses: { line: number; class: string }[]) {
  return ViewPlugin.fromClass(
    class {
      decorations: RangeSet<Decoration>;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || update.geometryChanged) {
          this.decorations = this.buildDecorations(update.view);
        }
      }

      buildDecorations(view: EditorView): RangeSet<Decoration> {
        const builder = new RangeSetBuilder<Decoration>();
        for (const { line, class: className } of lineClasses) {
          if (line <= view.state.doc.lines) {
            const lineInfo = view.state.doc.line(line);
            builder.add(lineInfo.from, lineInfo.from, Decoration.line({ class: className }));
          }
        }
        return builder.finish();
      }
    },
    {
      decorations: v => v.decorations,
    }
  );
}


const DiffView = ({ original, modified, language, originalCommitHash, modifiedCommitHash }: { original: string, modified: string, language: string, originalCommitHash?: string, modifiedCommitHash?: string }) => {
    const { originalLineClasses, modifiedLineClasses } = useMemo(() => {
        const diff = diffLines(original, modified);
        const originalClasses: { line: number; class: string }[] = [];
        const modifiedClasses: { line: number; class: string }[] = [];
        let originalLineNum = 1;
        let modifiedLineNum = 1;

        diff.forEach((part: Change) => {
            const lineCount = part.count || 0;
            if (part.added) {
                for (let i = 0; i < lineCount; i++) {
                    modifiedClasses.push({ line: modifiedLineNum + i, class: 'bg-green-500/20' });
                }
                modifiedLineNum += lineCount;
            } else if (part.removed) {
                for (let i = 0; i < lineCount; i++) {
                    originalClasses.push({ line: originalLineNum + i, class: 'bg-red-500/20' });
                }
                originalLineNum += lineCount;
            } else {
                originalLineNum += lineCount;
                modifiedLineNum += lineCount;
            }
        });

        return { originalLineClasses: originalClasses, modifiedLineClasses: modifiedClasses };
    }, [original, modified]);

    const originalExtensions = useMemo(() => [lineHighlighter(originalLineClasses), ...getLanguageExtension(language)], [originalLineClasses, language]);
    const modifiedExtensions = useMemo(() => [lineHighlighter(modifiedLineClasses), ...getLanguageExtension(language)], [modifiedLineClasses, language]);


    const commonEditorProps = {
        height: "100%",
        theme: vscodeDark,
        readOnly: true,
        basicSetup: {
            lineNumbers: true,
            foldGutter: true,
            autocompletion: false,
            editable: false,
        },
        style: {
            fontSize: '0.875rem',
            fontFamily: 'var(--font-code)',
        },
        className: "h-full"
    };

    return (
        <div className="flex flex-col h-full gap-2 p-2">
            <div className="flex-1 flex flex-col min-h-0">
                <h3 className="text-sm font-semibold mb-2 text-center text-muted-foreground shrink-0">
                    Selected Version {modifiedCommitHash && `(${modifiedCommitHash.substring(0,7)})`}
                </h3>
                <div className="flex-1 rounded-md border overflow-hidden">
                    <CodeMirror
                        value={modified}
                        extensions={modifiedExtensions}
                        {...commonEditorProps}
                    />
                </div>
            </div>
            <div className="flex-1 flex flex-col min-h-0">
                <h3 className="text-sm font-semibold mb-2 text-center text-muted-foreground shrink-0">
                    Previous Version {originalCommitHash && `(${originalCommitHash.substring(0,7)})`}
                </h3>
                <div className="flex-1 rounded-md border overflow-hidden">
                    <CodeMirror
                        value={original}
                        extensions={originalExtensions}
                        {...commonEditorProps}
                    />
                </div>
            </div>
        </div>
    );
};


export function EditorPanel({
  file,
  onCodeChange,
  onAiAction,
  onCompletion,
  isLoading,
  completion,
  onAcceptCompletion,
  onDismissCompletion,
  onCommitChange,
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
  const hasChanges = file.previousContent !== undefined;
  
  const activeCommitIndex = file.commits?.findIndex(c => c.hash === file.activeCommitHash) ?? -1;
  const previousCommit = (activeCommitIndex > -1 && file.commits && activeCommitIndex < file.commits.length - 1)
      ? file.commits[activeCommitIndex + 1]
      : null;

  const analyzeDisabled = isLoading || !hasChanges || viewMode === 'edit';

  const primaryActions: { id: ActionType; label: string; icon: React.ElementType }[] = [
    { id: 'explain', label: 'Explain Code', icon: BookText },
    { id: 'refactor', label: 'Refactor Code', icon: Wand2 },
  ];

  const secondaryActions: { id: ActionType; label: string; icon: React.ElementType }[] = [
      { id: 'bugs', label: 'Find Bugs', icon: Bug },
      { id: 'test', label: 'Generate Unit Test', icon: TestTube2 },
      { id: 'docs', label: 'Generate Comments', icon: NotebookText },
      { id: 'sdd', label: 'Generate SDD', icon: FileText },
  ];

  return (
    <Card className="h-full flex flex-col bg-card/50 shadow-lg">
      <CardHeader className="flex-shrink-0 flex flex-col md:flex-row items-center justify-between border-b p-4 space-y-2 md:space-y-0 md:space-x-4">
        <div className="flex-1 min-w-0 w-full">
          <CardTitle className="text-lg truncate" title={file.name}>{file.name}</CardTitle>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto justify-end">
          {file.commits && file.commits.length > 0 && (
            <div className="w-40 sm:w-56">
                <Select
                    value={file.activeCommitHash}
                    onValueChange={(newHash) => {
                        if (newHash) {
                            onCommitChange(file.id, newHash);
                        }
                    }}
                    disabled={isLoading}
                >
                    <SelectTrigger className="h-9">
                        <GitCommit className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                        <span className="truncate font-mono text-xs">
                          {file.activeCommitHash ? file.activeCommitHash.substring(0, 7) : 'Latest'}
                        </span>
                    </SelectTrigger>
                    <SelectContent>
                        {file.commits?.map(commit => (
                            <SelectItem key={commit.hash} value={commit.hash}>
                                <div className="flex flex-col text-left">
                                    <span className="font-medium truncate" title={commit.message}>{commit.message}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {commit.hash.substring(0, 7)} &bull; {formatDistanceToNow(new Date(commit.date), { addSuffix: true })}
                                    </span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          )}

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
                <p>{hasChanges ? (viewMode === 'edit' ? 'View Changes' : 'Back to Editor') : 'No previous version to compare'}</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onAiAction('analyze-diff', code, file.language, file.previousContent)}
                        disabled={analyzeDisabled}
                        aria-label="Analyze Changes"
                    >
                        <Sparkles className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>
                      {!hasChanges
                        ? 'No previous version to compare'
                        : viewMode === 'edit'
                        ? 'Click "View Changes" to enable analysis'
                        : 'Analyze Changes'}
                    </p>
                </TooltipContent>
            </Tooltip>

            <div className="w-[1px] h-6 bg-border mx-1"></div>

            {primaryActions.map((action) => (
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

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isLoading}
                      aria-label="More actions"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>More Actions</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                {secondaryActions.map((action) => (
                    <DropdownMenuItem key={action.id} onClick={() => onAiAction(action.id, code, file.language)} disabled={isLoading}>
                        <action.icon className="mr-2 h-4 w-4" />
                        <span>{action.label}</span>
                    </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 flex flex-col min-h-0">
        <div className="relative flex-1 min-h-0" onKeyDown={handleKeyDown}>
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
             <DiffView 
                original={file.previousContent ?? ''} 
                modified={code} 
                language={file.language} 
                originalCommitHash={previousCommit?.hash}
                modifiedCommitHash={file.activeCommitHash}
             />
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
