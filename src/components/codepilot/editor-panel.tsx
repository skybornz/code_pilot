
'use client';

import type { CodeFile } from '@/components/codepilot/types';
import { BookText, Bug, TestTube2, Wand2, FileText, GitCompare, Sparkles, GitCommit, MoreVertical, Bot, ChevronUp, ChevronDown, Info } from 'lucide-react';
import { useEffect, useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ActionType } from './types';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { python } from '@codemirror/lang-python';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { diffLines, type Change } from 'diff';
import { Decoration, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { RangeSet, RangeSetBuilder } from '@codemirror/state';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { showMinimap } from "@replit/codemirror-minimap"
import { TimeAgo } from '@/components/ui/time-ago';

interface EditorPanelProps {
  file: CodeFile;
  onCodeChange: (fileId: string, newContent: string) => void;
  onAiAction: (action: ActionType, code: string, language: string, originalCode?: string) => void;
  isLoading: boolean;
  onCommitChange: (fileId: string, commitHash: string) => void;
  handleShowCopilotChat: () => void;
  viewMode: 'edit' | 'diff';
  setViewMode: (mode: 'edit' | 'diff') => void;
}

const getLanguageExtension = (language: string) => {
  switch (language.toLowerCase()) {
    case 'javascript':
    case 'typescript':
    case 'tsx':
    case 'jsx':
    case 'json':
      return [javascript({ jsx: true, typescript: true })];
    case 'css':
      return [css()];
    case 'python':
      return [python()];
    default:
      // Fallback for languages like html, plaintext, etc.
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

let createMinimap = (v: EditorView) => {
    const dom = document.createElement('div');
    return { dom };
};

export function EditorPanel({
  file,
  onCodeChange,
  onAiAction,
  isLoading,
  onCommitChange,
  handleShowCopilotChat,
  viewMode,
  setViewMode,
}: EditorPanelProps) {
  const [code, setCode] = useState(file.content || '');
  const [scrollToLine, setScrollToLine] = useState<number | null>(null);
  const [currentChangeIndex, setCurrentChangeIndex] = useState(-1);
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  useEffect(() => {
    setCode(file.content || '');
  }, [file.content]);

  useEffect(() => {
    if (scrollToLine && editorRef.current?.view) {
        const view = editorRef.current.view;
        if (scrollToLine <= view.state.doc.lines) {
            const line = view.state.doc.line(scrollToLine);
            view.dispatch({
                effects: EditorView.scrollIntoView(line.from, {
                    y: 'center',
                }),
            });
        }
        setScrollToLine(null); // Reset after scrolling
    }
  }, [scrollToLine]);
  
  const handleCodeMirrorChange = (value: string) => {
    setCode(value);
    onCodeChange(file.id, value);
  };
  
    const { changeChunks, lineClasses } = useMemo(() => {
        if (!file.previousContent) {
            return { changeChunks: [], lineClasses: [] };
        }

        const lineClasses: { line: number; class: string }[] = [];
        const chunks: { startLine: number }[] = [];
        
        const diff = diffLines(file.previousContent, code);
        
        let newLine = 1;
        let inChangeBlock = false;

        diff.forEach((part: Change) => {
            const lineCount = part.count || 0;
            if (part.added) {
                if (!inChangeBlock) {
                    chunks.push({ startLine: newLine });
                    inChangeBlock = true;
                }
                for (let i = 0; i < lineCount; i++) {
                    lineClasses.push({ line: newLine + i, class: 'cm-line-bg-added' });
                }
                newLine += lineCount;
            } else if (part.removed) {
                if (!inChangeBlock) {
                   chunks.push({ startLine: newLine });
                   inChangeBlock = true;
                }
            } else { // common part
                inChangeBlock = false;
                newLine += lineCount;
            }
        });
        
        return { changeChunks: chunks, lineClasses };
    }, [file.previousContent, code]);

    const changeLines = useMemo(() => {
        return changeChunks.map(c => c.startLine);
    }, [changeChunks]);
    
    const handleNavigateChange = (direction: 'next' | 'prev') => {
        if (changeLines.length === 0) return;

        let nextIndex;
        if (direction === 'next') {
            nextIndex = (currentChangeIndex + 1) % changeLines.length;
        } else {
            nextIndex = (currentChangeIndex - 1 + changeLines.length) % changeLines.length;
        }
        
        setCurrentChangeIndex(nextIndex);
        setScrollToLine(changeLines[nextIndex]);
    };

    const handleViewChangesClick = () => {
        const isEnteringDiffMode = viewMode === 'edit';
        setViewMode(isEnteringDiffMode ? 'diff' : 'edit');

        if (isEnteringDiffMode && file.previousContent) {
            const firstChangeLine = changeLines.length > 0 ? changeLines[0] : null;
            if (firstChangeLine) {
                setScrollToLine(firstChangeLine);
                setCurrentChangeIndex(0);
            } else {
                setCurrentChangeIndex(-1);
            }
        } else {
            setCurrentChangeIndex(-1);
        }
    };

  const extensions = useMemo(() => {
    const minimapExtension = showMinimap.compute(['doc'], () => ({
        create: createMinimap,
        showOverlay: 'always',
        displayText: 'blocks',
    }));

    const baseExtensions = [
        ...getLanguageExtension(file.language),
        minimapExtension,
        EditorView.lineWrapping,
    ];

    if (viewMode === 'diff' && file.previousContent) {
        baseExtensions.push(lineHighlighter(lineClasses));
    }
    
    return baseExtensions;
  }, [file.language, viewMode, file.previousContent, lineClasses]);
  
  const analyzeDisabled = isLoading || !file.previousContent;

  const primaryActions: { id: ActionType; label: string; icon: React.ElementType }[] = [
    { id: 'explain', label: 'Explain Code', icon: BookText },
    { id: 'test', label: 'Generate Unit Test', icon: TestTube2 },
  ];

  const copilotAction = { id: 'copilot', label: 'AD Labs Chat', icon: Bot };

  const secondaryActions: { id: ActionType; label: string; icon: React.ElementType }[] = [
      { id: 'bugs', label: 'Find Bugs', icon: Bug },
      { id: 'refactor', label: 'Refactor Code', icon: Wand2 },
      { id: 'sdd', label: 'Generate SDD', icon: FileText },
  ];

  return (
    <Card className="h-full flex flex-col bg-card/50 shadow-lg">
      <CardHeader className="flex-shrink-0 flex flex-col md:flex-row items-center justify-between border-b p-4 space-y-2 md:space-y-0 md:space-x-4">
        <div className="flex-1 min-w-0 w-full">
          <CardTitle className="text-base font-semibold truncate" title={file.name}>{file.name}</CardTitle>
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
                                        {commit.hash.substring(0, 7)} &bull; <TimeAgo date={commit.date} />
                                    </span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          )}
          
          {viewMode === 'diff' && changeLines.length > 0 && (
            <div className="flex items-center gap-1 border-l ml-2 pl-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleNavigateChange('prev')} disabled={changeLines.length < 2}>
                                <ChevronUp className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Previous Change</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleNavigateChange('next')} disabled={changeLines.length < 2}>
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Next Change</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <span className="text-xs text-muted-foreground w-16 text-center">
                    {currentChangeIndex + 1} of {changeLines.length}
                </span>
            </div>
        )}

          <TooltipProvider>
            {file.previousContent !== undefined && (
                <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleViewChangesClick}
                    disabled={!file.previousContent}
                    data-active={viewMode === 'diff'}
                    className="data-[active=true]:bg-accent"
                    aria-label={viewMode === 'edit' ? 'View Changes' : 'Hide Changes'}
                    >
                    <GitCompare className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{!file.previousContent ? 'No previous version to compare' : (viewMode === 'edit' ? 'View Changes' : 'Hide Changes')}</p>
                </TooltipContent>
                </Tooltip>
            )}
            
            {viewMode === 'diff' && file.previousContent !== undefined && (
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
                        <p>{!file.previousContent ? 'No previous version for analysis' : 'Analyze Changes'}</p>
                    </TooltipContent>
                </Tooltip>
            )}

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
                <DropdownMenuItem key={copilotAction.id} onClick={handleShowCopilotChat} disabled={isLoading}>
                    <copilotAction.icon className="mr-2 h-4 w-4" />
                    <span>{copilotAction.label}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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
          <CodeMirror
              ref={editorRef}
              value={code}
              theme={vscodeDark}
              extensions={extensions}
              onChange={viewMode === 'edit' ? handleCodeMirrorChange : () => {}}
              readOnly={viewMode === 'diff'}
              height="100%"
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
      </CardContent>
    </Card>
  );
}
