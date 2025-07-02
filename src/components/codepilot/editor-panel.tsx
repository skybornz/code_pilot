
'use client';

import type { CodeFile } from '@/components/codepilot/types';
import { BookText, Bug, TestTube2, Wand2, NotebookText, FileText, GitCompare, Sparkles, GitCommit, MoreVertical, Bot } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';

interface EditorPanelProps {
  file: CodeFile;
  onCodeChange: (fileId: string, newContent: string) => void;
  onAiAction: (action: ActionType, code: string, language: string, originalCode?: string) => void;
  isLoading: boolean;
  onCommitChange: (fileId: string, commitHash: string) => void;
  onShowCopilotChat: () => void;
  viewMode: 'edit' | 'diff';
  setViewMode: (mode: 'edit' | 'diff') => void;
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

        return { originalLineClasses: originalClasses, modifiedLineClasses: modifiedLineClasses };
    }, [original, modified]);

    const originalExtensions = useMemo(() => [
        ...getLanguageExtension(language),
        lineHighlighter(originalLineClasses), 
    ], [originalLineClasses, language]);

    const modifiedExtensions = useMemo(() => [
        ...getLanguageExtension(language),
        lineHighlighter(modifiedLineClasses), 
    ], [modifiedLineClasses, language, original, modified]);


    const commonEditorStyle = {
        fontSize: '0.875rem',
        fontFamily: 'var(--font-code)',
    };
    
    const commonEditorSetup = {
        lineNumbers: true,
        foldGutter: true,
        autocompletion: false,
        editable: false,
        lineWrapping: false,
    };

    return (
        <div className="grid grid-rows-2 gap-2 p-2 h-full">
            <div className="flex flex-col min-h-0 relative">
                <h3 className="text-sm font-semibold mb-2 text-center text-muted-foreground shrink-0">
                    Selected Version {modifiedCommitHash && `(${modifiedCommitHash.substring(0,7)})`}
                </h3>
                <ScrollArea className="rounded-md border flex-1" orientation="both">
                     <CodeMirror
                        value={modified}
                        extensions={modifiedExtensions}
                        className="h-full"
                        theme={vscodeDark}
                        readOnly={true}
                        basicSetup={commonEditorSetup}
                        style={commonEditorStyle}
                    />
                </ScrollArea>
            </div>
            <div className="flex flex-col min-h-0 relative">
                <h3 className="text-sm font-semibold mb-2 text-center text-muted-foreground shrink-0">
                    Previous Version {originalCommitHash && `(${originalCommitHash.substring(0,7)})`}
                </h3>
                <ScrollArea className="rounded-md border flex-1" orientation="both">
                    <CodeMirror
                        value={original}
                        extensions={originalExtensions}
                        className="h-full"
                        theme={vscodeDark}
                        readOnly={true}
                        basicSetup={commonEditorSetup}
                        style={commonEditorStyle}
                    />
                </ScrollArea>
            </div>
        </div>
    );
};


export function EditorPanel({
  file,
  onCodeChange,
  onAiAction,
  isLoading,
  onCommitChange,
  onShowCopilotChat,
  viewMode,
  setViewMode,
}: EditorPanelProps) {
  const [code, setCode] = useState(file.content || '');

  useEffect(() => {
    setCode(file.content || '');
  }, [file.content]);
  
  const handleCodeMirrorChange = (value: string) => {
    setCode(value);
    onCodeChange(file.id, value);
  };
  
  const langExtension = useMemo(() => [
      ...getLanguageExtension(file.language),
  ], [file.language]);
  
  const activeCommitIndex = file.commits?.findIndex(c => c.hash === file.activeCommitHash) ?? -1;
  const hasPreviousVersion = activeCommitIndex > -1 && file.commits ? activeCommitIndex < file.commits.length - 1 : false;

  const previousCommit = hasPreviousVersion && file.commits ? file.commits[activeCommitIndex + 1] : null;

  const analyzeDisabled = isLoading || !hasPreviousVersion || viewMode === 'edit';

  const primaryActions: { id: ActionType; label: string; icon: React.ElementType }[] = [
    { id: 'explain', label: 'Explain Code', icon: BookText },
    { id: 'test', label: 'Generate Unit Test', icon: TestTube2 },
  ];

  const copilotAction = { id: 'copilot', label: 'Co-Pilot Chat', icon: Bot };

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
                  disabled={!hasPreviousVersion}
                  data-active={viewMode === 'diff'}
                  className="data-[active=true]:bg-accent"
                  aria-label="View Changes"
                >
                  <GitCompare className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{hasPreviousVersion ? (viewMode === 'edit' ? 'View Changes' : 'Back to Editor') : 'No previous version to compare'}</p>
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
                      {!hasPreviousVersion
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
                <DropdownMenuItem key={copilotAction.id} onClick={onShowCopilotChat} disabled={isLoading}>
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
        <div className="relative flex-1 min-h-0">
          {viewMode === 'edit' ? (
            <ScrollArea className="h-full" orientation="both">
                <CodeMirror
                  value={code}
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
            </ScrollArea>
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
      </CardContent>
    </Card>
  );
}
