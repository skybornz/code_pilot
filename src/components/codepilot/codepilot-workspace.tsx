'use client';

import type { AIOutput, ActionType, CodeFile, Commit } from '@/components/codepilot/types';
import { AIOutputPanel } from '@/components/codepilot/ai-output-panel';
import { EditorPanel } from '@/components/codepilot/editor-panel';
import { FileExplorer } from '@/components/codepilot/file-explorer';
import { Logo } from '@/components/codepilot/logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { codeCompletion } from '@/ai/flows/code-completion';
import { explainCode } from '@/ai/flows/explain-code';
import { findBugs } from '@/ai/flows/find-bugs';
import { generateUnitTest } from '@/ai/flows/generate-unit-test';
import { refactorCode } from '@/ai/flows/refactor-code';
import { generateCodeDocs } from '@/ai/flows/generate-code-docs';
import { generateSdd } from '@/ai/flows/generate-sdd';
import { analyzeDiff } from '@/ai/flows/analyze-diff';
import { Menu } from 'lucide-react';
import React, { useState, useCallback } from 'react';
import { ProjectLoader } from '@/components/codepilot/project-loader';
import { Card } from '@/components/ui/card';
import type { Project } from '@/lib/project-database';
import { fetchBitbucketFileCommits, getBitbucketFileContentForCommit } from '@/actions/github';
import { CopilotChatPanel } from './copilot-chat-panel';
import type { Message } from '@/ai/flows/copilot-chat';

export function SemCoPilotWorkspace() {
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [aiOutput, setAiOutput] = useState<AIOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedProjectInfo, setLoadedProjectInfo] = useState<{ project: Project; branch: string } | null>(null);
  const [rightPanelView, setRightPanelView] = useState<'ai-output' | 'copilot-chat'>('copilot-chat');
  const [chatMessages, setChatMessages] = useState<Message[] | undefined>(undefined);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleFilesLoaded = useCallback((loadedFiles: CodeFile[], project: Project, branch: string) => {
    setFiles(loadedFiles);
    setLoadedProjectInfo({ project, branch });
    if (loadedFiles.length > 0) {
      setActiveFileId(loadedFiles[0].id);
    } else {
      setActiveFileId(null);
    }
    setAiOutput(null);
    setRightPanelView('copilot-chat');
  }, []);

  const handleFileSelect = useCallback(async (fileId: string) => {
    setActiveFileId(fileId);
    setAiOutput(null);
    setRightPanelView('copilot-chat');

    const file = files.find(f => f.id === fileId);
    if (file && !file.commits && loadedProjectInfo) {
        setIsLoading(true);
        const result = await fetchBitbucketFileCommits(loadedProjectInfo.project.url, loadedProjectInfo.branch, file.id);
        
        if (result.success && result.commits && result.commits.length > 0) {
            const latestCommitHash = result.commits[0].hash;
            const previousCommitHash = result.commits.length > 1 ? result.commits[1].hash : null;

            const [latestContentResult, previousContentResult] = await Promise.all([
                getBitbucketFileContentForCommit(loadedProjectInfo.project.url, latestCommitHash, file.id),
                previousCommitHash 
                    ? getBitbucketFileContentForCommit(loadedProjectInfo.project.url, previousCommitHash, file.id) 
                    : Promise.resolve({ success: false })
            ]);

            setIsLoading(false);

            if (latestContentResult.success) {
                setFiles(prevFiles => prevFiles.map(f => 
                    f.id === fileId 
                        ? { 
                            ...f, 
                            content: latestContentResult.content ?? f.content,
                            previousContent: previousContentResult.success ? (previousContentResult.content ?? '') : undefined,
                            commits: result.commits, 
                            activeCommitHash: latestCommitHash,
                          } 
                        : f
                ));
            } else {
                 toast({
                    variant: 'destructive',
                    title: 'Error loading file content',
                    description: latestContentResult.error || 'Could not load file content for this commit.',
                });
            }
        } else {
            setIsLoading(false);
            if (result.error) {
                toast({
                    variant: 'destructive',
                    title: 'Error fetching commits',
                    description: result.error || 'Could not load commit history for this file.',
                });
            }
            // If no commits, just keep the file as is. It might have been loaded from main branch.
            setFiles(prevFiles => prevFiles.map(f => f.id === fileId ? { ...f, commits: [] } : f));
        }
    }
  }, [files, loadedProjectInfo, toast]);

  const handleCommitChange = useCallback(async (fileId: string, commitHash: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file || !file.commits || !loadedProjectInfo) return;

    const commitIndex = file.commits.findIndex(c => c.hash === commitHash);
    if (commitIndex === -1) return;

    const previousCommitHash = commitIndex < file.commits.length - 1 ? file.commits[commitIndex + 1].hash : null;

    setIsLoading(true);
    const [currentContentResult, previousContentResult] = await Promise.all([
        getBitbucketFileContentForCommit(loadedProjectInfo.project.url, commitHash, file.id),
        previousCommitHash
            ? getBitbucketFileContentForCommit(loadedProjectInfo.project.url, previousCommitHash, file.id)
            : Promise.resolve({ success: false })
    ]);
    setIsLoading(false);

    if (currentContentResult.success) {
        setFiles(prevFiles => prevFiles.map(f => 
            f.id === fileId 
                ? { 
                    ...f, 
                    content: currentContentResult.content ?? f.content, 
                    previousContent: previousContentResult.success ? (previousContentResult.content ?? '') : undefined,
                    activeCommitHash: commitHash 
                  } 
                : f
        ));
        setAiOutput(null);
    } else {
        toast({
            variant: 'destructive',
            title: 'Error loading file content',
            description: currentContentResult.error || 'Could not load file content for this commit.',
        });
    }
  }, [files, loadedProjectInfo, toast]);

  const activeFile = files.find((f) => f.id === activeFileId);

  const handleCodeChange = (fileId: string, newContent: string) => {
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.id === fileId ? { ...file, content: newContent } : file
      )
    );
  };

  const handleAiAction = useCallback(async (action: ActionType, code: string, language: string, originalCode?: string) => {
    setIsLoading(true);
    setAiOutput(null);
    setRightPanelView('ai-output');
    setChatMessages(undefined);
    try {
      let result: AIOutput | null = null;
      if (action === 'analyze-diff' && originalCode !== undefined) {
        const analysis = await analyzeDiff({ oldCode: originalCode, newCode: code, language });
        result = { type: 'analyze-diff', data: analysis, title: 'Change Analysis' };
      } else if (action === 'explain') {
        const explanationData = await explainCode({ code });
        result = { type: 'explain', data: explanationData, title: 'Code Explanation' };
      } else if (action === 'bugs') {
        const bugReport = await findBugs({ code });
        result = { type: 'bugs', data: bugReport, title: 'Bug Report' };
      } else if (action === 'test') {
        const unitTest = await generateUnitTest({ code, language });
        result = { type: 'test', data: unitTest, title: 'Generated Unit Test', language };
      } else if (action === 'refactor') {
        const refactored = await refactorCode({ code, language });
        result = { type: 'refactor', data: refactored, title: 'Refactor Suggestion', language };
      } else if (action === 'docs') {
        const { documentation } = await generateCodeDocs({ code });
        result = { type: 'docs', data: { documentation }, title: 'Generated Comments', language };
      } else if (action === 'sdd') {
        const sdd = await generateSdd({ code });
        result = { type: 'sdd', data: sdd, title: 'Software Design Document', language: 'markdown' };
      }
      setAiOutput(result);
    } catch (error) {
      console.error('AI action failed:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'The AI action failed. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleCompletion = useCallback(async (code: string, language: string) => {
    try {
      const { completion } = await codeCompletion({ codeSnippet: code, language });
      if (completion) {
        setAiOutput({ type: 'completion', data: completion, title: 'Code Completion' });
      }
    } catch (error) {
      console.error('Code completion failed:', error);
      // Do not show toast for completion to avoid being noisy
    }
  }, []);

  const handleSwitchProject = () => {
    setFiles([]);
    setActiveFileId(null);
    setLoadedProjectInfo(null);
    setAiOutput(null);
    setChatMessages(undefined);
    setRightPanelView('copilot-chat');
  };
  
  const handleShowCopilotChat = () => {
    setRightPanelView('copilot-chat');
    setChatMessages(undefined);
    setAiOutput(null);
  };
  
  const editor = activeFile ? (
    <EditorPanel
      key={`${activeFile.id}-${activeFile.activeCommitHash || 'latest'}`}
      file={activeFile}
      onCodeChange={handleCodeChange}
      onAiAction={handleAiAction}
      onCompletion={handleCompletion}
      onCommitChange={handleCommitChange}
      isLoading={isLoading}
      completion={aiOutput?.type === 'completion' ? aiOutput.data : null}
      onAcceptCompletion={(completion) => {
        if (activeFile) {
          handleCodeChange(activeFile.id, activeFile.content + completion);
        }
        setAiOutput(null);
      }}
      onDismissCompletion={() => setAiOutput(null)}
      onShowCopilotChat={handleShowCopilotChat}
    />
  ) : (
    <Card className="h-full flex flex-col bg-card/50 shadow-lg justify-center items-center">
        <p className="text-muted-foreground">Select a file from the explorer to view its content.</p>
    </Card>
  );

  const rightPanelContent = () => {
    switch (rightPanelView) {
      case 'copilot-chat':
        return <CopilotChatPanel activeFile={activeFile} initialMessages={chatMessages} />;
      case 'ai-output':
        return <AIOutputPanel output={aiOutput} isLoading={isLoading} activeFile={activeFile} />;
      default:
        return <CopilotChatPanel activeFile={activeFile} initialMessages={chatMessages}/>;
    }
  };
  
  if (isMobile) {
    return (
      <div className="h-screen bg-background text-foreground flex flex-col">
        <header className="flex items-center justify-between p-4 border-b">
          <Logo />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] p-0">
               <FileExplorer
                 files={files}
                 activeFileId={activeFileId}
                 onFileSelect={handleFileSelect}
                 onSwitchProject={handleSwitchProject}
                 project={loadedProjectInfo?.project}
                 branch={loadedProjectInfo?.branch}
               />
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex-1 overflow-y-auto p-4">
          {loadedProjectInfo ? (
            <>
              <div className="h-[50vh]">
                {editor}
              </div>
              <div className="mt-4 h-[calc(50vh-6rem)]">
                {rightPanelContent()}
              </div>
            </>
           ) : (
            <div className="h-full flex items-center justify-center">
              <ProjectLoader onFilesLoaded={handleFilesLoaded} />
            </div>
           )}
        </main>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background text-foreground flex">
      <FileExplorer
        files={files}
        activeFileId={activeFileId}
        onFileSelect={handleFileSelect}
        onSwitchProject={handleSwitchProject}
        project={loadedProjectInfo?.project}
        branch={loadedProjectInfo?.branch}
      />
      <main className="flex-1 flex gap-4 p-4 overflow-hidden">
        {loadedProjectInfo ? (
          <>
            <div className="flex-1 flex flex-col min-w-0">
              {editor}
            </div>
            <div className="flex-1 flex flex-col min-w-0">
              {rightPanelContent()}
            </div>
          </>
        ) : (
          <div className="w-full h-full">
             <ProjectLoader onFilesLoaded={handleFilesLoaded} />
          </div>
        )}
      </main>
    </div>
  );
}
