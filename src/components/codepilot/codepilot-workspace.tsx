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
import { Menu, Loader2 } from 'lucide-react';
import React, { useState, useCallback, useEffect } from 'react';
import { ProjectLoader } from '@/components/codepilot/project-loader';
import { Card } from '@/components/ui/card';
import type { Project } from '@/lib/project-database';
import { fetchBitbucketFileCommits, getBitbucketFileContentForCommit, loadBitbucketFiles } from '@/actions/github';
import { CopilotChatPanel } from './copilot-chat-panel';
import type { Message } from '@/ai/flows/copilot-chat';
import { useAuth } from '@/context/auth-context';
import { logUserActivity } from '@/actions/activity';
import { getDefaultModel } from '@/actions/models';

const ACTIVE_PROJECT_KEY_PREFIX = 'semco_active_project_';

export function SemCoPilotWorkspace() {
  const { user } = useAuth();
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [aiOutput, setAiOutput] = useState<AIOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [loadedProjectInfo, setLoadedProjectInfo] = useState<{ project: Project; branch: string } | null>(null);
  const [rightPanelView, setRightPanelView] = useState<'ai-output' | 'copilot-chat'>('copilot-chat');
  const [copilotChatMessages, setCopilotChatMessages] = useState<Message[]>([]);
  const [analysisChatMessages, setAnalysisChatMessages] = useState<Message[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [editorViewMode, setEditorViewMode] = useState<'edit' | 'diff'>('edit');
  
  const activeFile = files.find((f) => f.id === activeFileId);
  const activeProjectKey = user ? `${ACTIVE_PROJECT_KEY_PREFIX}${user.id}` : null;


  const resetCopilotChat = useCallback(() => {
    setCopilotChatMessages([
      { role: 'model', content: "Hello! I'm SemCo-Pilot. How can I help you with your code today?" }
    ]);
  }, []);
  
  const handleFilesLoaded = useCallback((loadedFiles: CodeFile[], project: Project, branch: string) => {
    setFiles(loadedFiles);
    setLoadedProjectInfo({ project, branch });
    if (activeProjectKey) {
        try {
            localStorage.setItem(activeProjectKey, JSON.stringify({ project, branch }));
        } catch (e) {
            console.error("Could not save project info to localStorage", e);
        }
    }
    if (loadedFiles.length > 0) {
      setActiveFileId(loadedFiles[0].id);
    } else {
      setActiveFileId(null);
    }
    setAiOutput(null);
    resetCopilotChat();
    setAnalysisChatMessages([]);
    setRightPanelView('copilot-chat');
  }, [resetCopilotChat, activeProjectKey]);

  useEffect(() => {
    resetCopilotChat();
  }, [resetCopilotChat]);

  useEffect(() => {
    const loadProjectFromStorage = async () => {
      if (!activeProjectKey) {
        setIsInitializing(false);
        return;
      }
      try {
        const storedInfo = localStorage.getItem(activeProjectKey);
        if (storedInfo) {
          const { project, branch } = JSON.parse(storedInfo);
          const result = await loadBitbucketFiles(project.url, branch);
          if (result.success && result.files) {
            handleFilesLoaded(result.files, project, branch);
          } else {
            toast({ variant: 'destructive', title: 'Failed to auto-reload project', description: result.error });
            localStorage.removeItem(activeProjectKey);
          }
        }
      } catch (error) {
        console.error('Failed to load project from storage:', error);
        localStorage.removeItem(activeProjectKey);
      } finally {
        setIsInitializing(false);
      }
    };

    if (user) {
      loadProjectFromStorage();
    }
  }, [handleFilesLoaded, toast, user, activeProjectKey]);

  const handleFileSelect = useCallback(async (fileId: string) => {
    setActiveFileId(fileId);
    setEditorViewMode('edit');

    const file = files.find(f => f.id === fileId);
    if (file && !file.commits && loadedProjectInfo) {
        setIsFileLoading(true);
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

            setIsFileLoading(false);

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
            setIsFileLoading(false);
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

    setIsFileLoading(true);
    const [currentContentResult, previousContentResult] = await Promise.all([
        getBitbucketFileContentForCommit(loadedProjectInfo.project.url, commitHash, file.id),
        previousCommitHash
            ? getBitbucketFileContentForCommit(loadedProjectInfo.project.url, previousCommitHash, file.id)
            : Promise.resolve({ success: false })
    ]);
    setIsFileLoading(false);

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
        setEditorViewMode('edit');
    } else {
        toast({
            variant: 'destructive',
            title: 'Error loading file content',
            description: currentContentResult.error || 'Could not load file content for this commit.',
        });
    }
  }, [files, loadedProjectInfo, toast]);

  const handleCodeChange = (fileId: string, newContent: string) => {
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.id === fileId ? { ...file, content: newContent } : file
      )
    );
  };

  const handleAiAction = useCallback(async (action: ActionType, code: string, language: string, originalCode?: string) => {
    if (!user) return;
    setIsLoading(true);
    setAnalysisChatMessages([]);
    setRightPanelView('ai-output');
    
    const modelConfig = await getDefaultModel();
    if (!modelConfig) {
      toast({
        variant: 'destructive',
        title: 'No Default Model Set',
        description: 'An administrator needs to set a default AI model in the settings.',
      });
      setIsLoading(false);
      return;
    }
    const model = `googleai/${modelConfig.name}`;
    
    let result: Omit<AIOutput, 'fileContext'> | null = null;
    let actionName: string = 'Unknown AI Action';
    try {
      if (action === 'analyze-diff' && originalCode !== undefined) {
        actionName = 'Analyze Diff';
        const analysis = await analyzeDiff({ model, oldCode: originalCode, newCode: code, language });
        result = { type: 'analyze-diff', data: analysis, title: 'Change Analysis' };
      } else if (action === 'explain') {
        actionName = 'Explain Code';
        const explanationData = await explainCode({ model, code });
        result = { type: 'explain', data: explanationData, title: 'Code Explanation' };
      } else if (action === 'bugs') {
        actionName = 'Find Bugs';
        const bugReport = await findBugs({ model, code });
        result = { type: 'bugs', data: bugReport, title: 'Bug Report' };
      } else if (action === 'test') {
        actionName = 'Generate Test';
        const unitTest = await generateUnitTest({ model, code, language });
        result = { type: 'test', data: unitTest, title: 'Generated Unit Test', language };
      } else if (action === 'refactor') {
        actionName = 'Refactor Code';
        const refactored = await refactorCode({ model, code, language });
        result = { type: 'refactor', data: refactored, title: 'Refactor Suggestion', language };
      } else if (action === 'docs') {
        actionName = 'Generate Docs';
        const { documentation } = await generateCodeDocs({ model, code });
        result = { type: 'docs', data: { documentation }, title: 'Generated Comments', language };
      } else if (action === 'sdd') {
        actionName = 'Generate SDD';
        const sdd = await generateSdd({ model, code });
        result = { type: 'sdd', data: sdd, title: 'Software Design Document', language: 'markdown' };
      }

      if (result && activeFile) {
        setAiOutput({ 
            ...result, 
            fileContext: { id: activeFile.id, name: activeFile.name } 
        });
      } else if (result) {
        setAiOutput(result as AIOutput);
      }
      
      await logUserActivity(user.id, actionName, `Used ${actionName} on file: ${activeFile?.name || 'unknown'}`);

    } catch (error) {
      console.error('AI action failed:', error);
      toast({
        variant: 'destructive',
        title: 'AI Action Failed',
        description:
          'Could not get a response from the AI model. Please check your model configuration and try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, activeFile, user]);

  const handleCompletion = useCallback(async (code: string, language: string) => {
    try {
      const modelConfig = await getDefaultModel();
      if (!modelConfig) return;
      const model = `googleai/${modelConfig.name}`;

      const { completion } = await codeCompletion({ model, codeSnippet: code, language });
      if (completion) {
        setAiOutput({ type: 'completion', data: completion, title: 'Code Completion' });
      }
    } catch (error) {
      console.error('Code completion failed:', error);
      toast({
        variant: 'destructive',
        title: 'Code Completion Failed',
        description: 'The AI model could not provide a suggestion.',
      });
    }
  }, [toast]);

  const handleSwitchProject = () => {
    setFiles([]);
    setActiveFileId(null);
    setLoadedProjectInfo(null);
    setAiOutput(null);
    if (activeProjectKey) {
        try {
            localStorage.removeItem(activeProjectKey);
        } catch (e) {
            console.error("Could not remove project info from localStorage", e);
        }
    }
    resetCopilotChat();
    setAnalysisChatMessages([]);
    setRightPanelView('copilot-chat');
  };
  
  const handleShowCopilotChat = () => {
    setRightPanelView('copilot-chat');
  };
  
  if (isInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const editor = activeFile ? (
    <EditorPanel
      key={`${activeFile.id}-${activeFile.activeCommitHash || 'latest'}`}
      file={activeFile}
      onCodeChange={handleCodeChange}
      onAiAction={handleAiAction}
      onCompletion={handleCompletion}
      onCommitChange={handleCommitChange}
      isLoading={isLoading || isFileLoading}
      completion={aiOutput?.type === 'completion' ? aiOutput.data : null}
      onAcceptCompletion={(completion) => {
        if (activeFile) {
          handleCodeChange(activeFile.id, activeFile.content + completion);
        }
        setAiOutput(null);
      }}
      onDismissCompletion={() => setAiOutput(null)}
      onShowCopilotChat={handleShowCopilotChat}
      viewMode={editorViewMode}
      setViewMode={setEditorViewMode}
    />
  ) : (
    <Card className="h-full flex flex-col bg-card/50 shadow-lg justify-center items-center">
        <p className="text-muted-foreground">Select a file from the explorer to view its content.</p>
    </Card>
  );

  const rightPanelContent = () => {
    switch (rightPanelView) {
      case 'copilot-chat':
        return <CopilotChatPanel 
            activeFile={activeFile} 
            messages={copilotChatMessages}
            onMessagesChange={setCopilotChatMessages}
            isChatLoading={isChatLoading}
            setIsChatLoading={setIsChatLoading}
        />;
      case 'ai-output':
        return <AIOutputPanel 
            output={aiOutput} 
            isLoading={isLoading}
            messages={analysisChatMessages}
            onMessagesChange={setAnalysisChatMessages}
            isChatLoading={isChatLoading}
            setIsChatLoading={setIsChatLoading}
        />;
      default:
        return <CopilotChatPanel 
            activeFile={activeFile} 
            messages={copilotChatMessages}
            onMessagesChange={setCopilotChatMessages}
            isChatLoading={isChatLoading}
            setIsChatLoading={setIsChatLoading}
        />;
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
