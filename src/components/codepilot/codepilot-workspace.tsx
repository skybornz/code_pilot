
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
import { Menu } from 'lucide-react';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ProjectLoader } from '@/components/codepilot/project-loader';
import { Card } from '@/components/ui/card';
import type { Project } from '@/lib/project-database';
import { fetchBitbucketFileCommits, getBitbucketFileContentForCommit, loadBitbucketFiles, fetchDirectory, fetchFileWithContent, getMainBranch } from '@/actions/github';
import { CopilotChatPanel } from './copilot-chat-panel';
import type { Message } from '@/ai/flows/copilot-chat';
import { useAuth } from '@/context/auth-context';
import { updateUserLastActive } from '@/actions/users';
import { performAiAction } from '@/actions/ai';
import { DashboardHeader } from '../dashboard/dashboard-header';
import { LoadingSpinner } from '../ui/loading-spinner';
import { GenerateTestDialog } from './generate-test-dialog';

const ACTIVE_PROJECT_KEY_PREFIX = 'adlabs_active_project_';

export function ADLabsWorkspace() {
  const { user } = useAuth();
  const [allFiles, setAllFiles] = useState<CodeFile[]>([]);
  const [openFiles, setOpenFiles] = useState<CodeFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [aiOutput, setAiOutput] = useState<AIOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [loadedProjectInfo, setLoadedProjectInfo] = useState<{ project: Project; branch: string, mainBranch: string } | null>(null);
  const [rightPanelView, setRightPanelView] = useState<'ai-output' | 'copilot-chat'>('copilot-chat');
  const [copilotChatMessages, setCopilotChatMessages] = useState<Message[]>([]);
  const [analysisChatMessages, setAnalysisChatMessages] = useState<Message[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [editorViewMode, setEditorViewMode] = useState<'edit' | 'diff'>('edit');
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  
  const activeFile = useMemo(() => openFiles.find((f) => f.id === activeFileId), [openFiles, activeFileId]);
  const activeProjectKey = user ? `${ACTIVE_PROJECT_KEY_PREFIX}${user.id}` : null;

  const resetCopilotChat = useCallback(() => {
    setCopilotChatMessages([
      { role: 'model', content: "Hello! I'm the AD Labs assistant. How can I help you with your code today?" }
    ]);
  }, []);

  const handleAiAction = useCallback((action: ActionType, code: string, language: string, originalCode?: string, dependencies?: { name: string; content: string }[], remarks?: string) => {
    if (!user) return;
    setIsLoading(true);
    setAnalysisChatMessages([]);
    setRightPanelView('ai-output');
    
    // Use a functional update to get the latest file name without adding activeFile as a dependency
    let currentFileName = '';
    setOpenFiles(currentFiles => {
        const currentFile = currentFiles.find(f => f.id === activeFileId);
        currentFileName = currentFile?.name || '';
        return currentFiles;
    });

    performAiAction(user.id, action, code, language, originalCode, currentFileName, dependencies, remarks).then(result => {
      if ('error' in result) {
        toast({
          variant: 'destructive',
          title: 'AI Action Failed',
          description: result.error,
        });
      } else {
          const outputWithContext: AIOutput = { ...result, fileContext: { id: activeFileId!, name: currentFileName } };
          setAiOutput(outputWithContext);
      }
      setIsLoading(false);
    });

  }, [toast, user, activeFileId]);
  
  const handleGenerateTest = useCallback(
    (dependencies: { name: string; content: string }[], remarks: string) => {
      if (activeFile?.content) {
        handleAiAction('test', activeFile.content, activeFile.language, undefined, dependencies, remarks);
      }
    },
    [activeFile, handleAiAction]
  );
  
  const handleFilesLoaded = useCallback(async (loadedFiles: Partial<CodeFile>[], project: Project, branch: string) => {
    if (!user) return;
    const mainBranch = await getMainBranch(project.url, user.id);
    if (!mainBranch) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not determine the main branch of the repository.' });
        return;
    }

    setAllFiles(loadedFiles as CodeFile[]);
    setLoadedProjectInfo({ project, branch, mainBranch });

    if (activeProjectKey) {
        try {
            localStorage.setItem(activeProjectKey, JSON.stringify({ project, branch }));
        } catch (e) {
            console.error("Could not save project info to localStorage", e);
        }
    }
    
    setOpenFiles([]);
    setActiveFileId(null);
    setAiOutput(null);
    resetCopilotChat();
    setAnalysisChatMessages([]);
    setRightPanelView('copilot-chat');
    await updateUserLastActive(user.id);

  }, [resetCopilotChat, activeProjectKey, user, toast]);

  useEffect(() => {
    resetCopilotChat();
  }, [resetCopilotChat]);

  useEffect(() => {
    // We no longer automatically load the project from local storage.
    // This ensures the user always sees the project selection screen first.
    setIsInitializing(false);
  }, []);

  const handleFileSelect = useCallback(async (fileId: string) => {
    if (!user || !loadedProjectInfo) return;

    // If file is already open, just make it active
    const alreadyOpen = openFiles.find(f => f.id === fileId);
    if (alreadyOpen) {
      setActiveFileId(fileId);
      return;
    }

    const fileInfoFromAll = allFiles.find(f => f.id === fileId);
    if (!fileInfoFromAll || fileInfoFromAll.type === 'folder') return;
    
    let fileToOpen: CodeFile = { ...fileInfoFromAll, content: '' }; // Create a new object for the open file

    setActiveFileId(fileId);
    setIsFileLoading(true);
    setOpenFiles(prev => [...prev, fileToOpen]); // Add to open files immediately to show tab

    const [contentResult, commitsResult] = await Promise.all([
        fetchFileWithContent(loadedProjectInfo.project.url, loadedProjectInfo.branch, loadedProjectInfo.mainBranch, fileId, user.id),
        fetchBitbucketFileCommits(loadedProjectInfo.project.url, loadedProjectInfo.branch, fileId, user.id)
    ]);
    
    setIsFileLoading(false);
    
    if (contentResult.success) {
      fileToOpen.content = contentResult.content;
      fileToOpen.originalContent = contentResult.originalContent;
      
      if (commitsResult.success && commitsResult.commits && commitsResult.commits.length > 0) {
        fileToOpen.commits = commitsResult.commits;
        fileToOpen.activeCommitHash = commitsResult.commits[0].hash;
        const previousCommitHash = commitsResult.commits.length > 1 ? commitsResult.commits[1].hash : null;
        if (previousCommitHash) {
          const prevContentResult = await getBitbucketFileContentForCommit(loadedProjectInfo.project.url, previousCommitHash, fileId, user.id);
          if (prevContentResult.success) {
            fileToOpen.previousContent = prevContentResult.content;
          }
        }
      }

      setOpenFiles(prevOpenFiles => prevOpenFiles.map(f => f.id === fileId ? fileToOpen : f));
    } else {
        toast({
            variant: 'destructive',
            title: 'Error loading file content',
            description: contentResult.error || 'Could not load file content.',
        });
        // Remove the tab if loading failed
        setOpenFiles(prev => prev.filter(f => f.id !== fileId));
        if (activeFileId === fileId) {
            setActiveFileId(openFiles.length > 1 ? (openFiles[openFiles.length - 2]?.id ?? null) : null);
        }
    }
  }, [openFiles, allFiles, loadedProjectInfo, toast, user, activeFileId]);

  const handleFolderExpand = useCallback(async (folderId: string) => {
    if (!user || !loadedProjectInfo) return;
    
    const result = await fetchDirectory(loadedProjectInfo.project.url, loadedProjectInfo.branch, folderId, user.id);

    if (result.success && result.files) {
        setAllFiles(prevFiles => {
            const newFiles = [...prevFiles];
            const folderIndex = newFiles.findIndex(f => f.id === folderId);
            if (folderIndex > -1) {
                newFiles[folderIndex] = { ...newFiles[folderIndex], childrenLoaded: true };
            }
            // Add new items, avoiding duplicates
            const existingIds = new Set(newFiles.map(f => f.id));
            const itemsToAdd = result.files!.filter(newItem => !existingIds.has(newItem.id!));

            return [...newFiles, ...itemsToAdd as CodeFile[]];
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'Error expanding directory',
            description: result.error || 'Could not load directory contents.',
        });
    }
  }, [user, loadedProjectInfo, toast]);


  const handleCommitChange = useCallback(async (fileId: string, commitHash: string) => {
    if (!user) return;
    const file = openFiles.find(f => f.id === fileId);
    if (!file || !file.commits || !loadedProjectInfo) return;

    const commitIndex = file.commits.findIndex(c => c.hash === commitHash);
    if (commitIndex === -1) return;

    const previousCommitHash = commitIndex < file.commits.length - 1 ? file.commits[commitIndex + 1].hash : null;

    setIsFileLoading(true);
    const currentContentResult = await getBitbucketFileContentForCommit(loadedProjectInfo.project.url, commitHash, file.id, user.id);
    const previousContentResult = previousCommitHash
        ? await getBitbucketFileContentForCommit(loadedProjectInfo.project.url, previousCommitHash, file.id, user.id)
        : { success: false, content: undefined, error: "No previous commit" };
    setIsFileLoading(false);

    if (currentContentResult.success) {
        setOpenFiles(prevFiles => prevFiles.map(f => 
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
  }, [openFiles, loadedProjectInfo, toast, user]);

  const handleCodeChange = (fileId: string, newContent: string) => {
    setOpenFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.id === fileId ? { ...file, content: newContent } : file
      )
    );
  };

  const handleSwitchProject = () => {
    setAllFiles([]);
    setOpenFiles([]);
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
  
  const handleTabClose = (fileIdToClose: string) => {
    const fileIndex = openFiles.findIndex(f => f.id === fileIdToClose);
    if (fileIndex === -1) return;

    const newOpenFiles = openFiles.filter(f => f.id !== fileIdToClose);
    setOpenFiles(newOpenFiles);

    if (activeFileId === fileIdToClose) {
        if (newOpenFiles.length === 0) {
            setActiveFileId(null);
        } else {
            // Activate the previous tab, or the first one if closing the first tab
            const newActiveIndex = Math.max(0, fileIndex - 1);
            setActiveFileId(newOpenFiles[newActiveIndex].id);
        }
    }
  };

  const otherOpenFiles = useMemo(() => openFiles.filter(f => f.id !== activeFileId), [openFiles, activeFileId]);

  if (isInitializing || isMobile === undefined) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <LoadingSpinner text="Initializing workspace..." />
      </div>
    );
  }

  // If no project is loaded, show the project loader inside the main dashboard layout.
  if (!loadedProjectInfo) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <DashboardHeader />
        <main className="flex-1 flex flex-col">
          <ProjectLoader onFilesLoaded={handleFilesLoaded} />
        </main>
      </div>
    );
  }
  
  // If a project is loaded, render the full IDE experience.
  const editor = (isFileLoading && activeFile?.type === 'file') ? (
     <Card className="h-full flex flex-col bg-card/50 shadow-lg justify-center items-center">
        <LoadingSpinner text="Loading file content..." />
    </Card>
  ) : activeFile && activeFile.type === 'file' ? (
    <EditorPanel
        file={activeFile}
        onCodeChange={handleCodeChange}
        onAiAction={handleAiAction}
        isLoading={isLoading}
        onCommitChange={handleCommitChange}
        handleShowCopilotChat={handleShowCopilotChat}
        viewMode={editorViewMode}
        setViewMode={setEditorViewMode}
        openFiles={openFiles}
        onTabSelect={setActiveFileId}
        onTabClose={handleTabClose}
        onGenTestClick={() => setIsTestDialogOpen(true)}
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
            activeFile={activeFile || null} 
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
            activeFile={activeFile || null} 
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
                 files={allFiles}
                 activeFileId={activeFileId}
                 onFileSelect={handleFileSelect}
                 onSwitchProject={handleSwitchProject}
                 onFolderExpand={handleFolderExpand}
                 project={loadedProjectInfo?.project}
                 branch={loadedProjectInfo?.branch}
               />
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex-1 overflow-y-auto p-4">
          <>
            <div className="h-[50vh]">
              {editor}
            </div>
            <div className="mt-4 h-[calc(50vh-6rem)]">
              {rightPanelContent()}
            </div>
          </>
        </main>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background text-foreground flex">
      <FileExplorer
        files={allFiles}
        activeFileId={activeFileId}
        onFileSelect={handleFileSelect}
        onSwitchProject={handleSwitchProject}
        onFolderExpand={handleFolderExpand}
        project={loadedProjectInfo?.project}
        branch={loadedProjectInfo?.branch}
      />
      <main className="flex-1 flex gap-4 p-4 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
            {editor}
        </div>
        <div className="flex-1 flex flex-col min-w-0">
            {rightPanelContent()}
        </div>
      </main>

      {activeFile && (
        <GenerateTestDialog
          open={isTestDialogOpen}
          onOpenChange={setIsTestDialogOpen}
          activeFile={activeFile}
          otherOpenFiles={otherOpenFiles}
          onGenerate={handleGenerateTest}
        />
      )}
    </div>
  );
}
