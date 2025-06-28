'use client';

import type { AIOutput, ActionType, CodeFile } from '@/components/codepilot/types';
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
import { Menu } from 'lucide-react';
import React, { useState, useCallback } from 'react';
import { ProjectLoader } from '@/components/codepilot/project-loader';
import { Card } from '@/components/ui/card';

export default function CodePilotPage() {
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [aiOutput, setAiOutput] = useState<AIOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleFilesLoaded = useCallback((loadedFiles: CodeFile[]) => {
    setFiles(loadedFiles);
    if (loadedFiles.length > 0) {
      setActiveFileId(loadedFiles[0].id);
    } else {
      setActiveFileId(null);
    }
  }, []);

  const activeFile = files.find((f) => f.id === activeFileId);

  const handleFileSelect = (fileId: string) => {
    setActiveFileId(fileId);
    setAiOutput(null);
  };

  const handleCodeChange = (fileId: string, newContent: string) => {
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.id === fileId ? { ...file, content: newContent } : file
      )
    );
  };

  const handleApplyChanges = (newCode: string) => {
    if (activeFile) {
      handleCodeChange(activeFile.id, newCode);
      setAiOutput(null);
      toast({
        title: 'Changes Applied',
        description: `${activeFile.name} has been updated with the refactored code.`,
      });
    }
  };

  const handleAiAction = useCallback(async (action: ActionType, code: string, language: string) => {
    setIsLoading(true);
    setAiOutput(null);
    try {
      let result: AIOutput | null = null;
      if (action === 'explain') {
        const { explanation } = await explainCode({ code });
        result = { type: 'explain', data: explanation, title: 'Code Explanation' };
      } else if (action === 'bugs') {
        const bugReport = await findBugs({ code });
        result = { type: 'bugs', data: bugReport, title: 'Bug Report' };
      } else if (action === 'test') {
        const unitTest = await generateUnitTest({ code, language });
        result = { type: 'test', data: unitTest, title: 'Generated Unit Test' };
      } else if (action === 'refactor') {
        const refactored = await refactorCode({ code, language });
        result = { type: 'refactor', data: refactored, title: 'Refactor Suggestion' };
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

  const handleUploadClick = () => {
    setFiles([]);
    setActiveFileId(null);
    setAiOutput(null);
  };

  if (files.length === 0) {
    return <ProjectLoader onFilesLoaded={handleFilesLoaded} />;
  }

  const editor = activeFile ? (
    <EditorPanel
      key={activeFile.id}
      file={activeFile}
      onCodeChange={handleCodeChange}
      onAiAction={handleAiAction}
      onCompletion={handleCompletion}
      isLoading={isLoading}
      completion={aiOutput?.type === 'completion' ? aiOutput.data : null}
      onAcceptCompletion={(completion) => {
        if (activeFile) {
          handleCodeChange(activeFile.id, activeFile.content + completion);
        }
        setAiOutput(null);
      }}
      onDismissCompletion={() => setAiOutput(null)}
    />
  ) : (
    <Card className="h-full flex flex-col bg-card/50 shadow-lg justify-center items-center">
        <p className="text-muted-foreground">Select a file from the explorer to view its content.</p>
    </Card>
  );

  const outputPanel = (
    <AIOutputPanel
      output={aiOutput}
      isLoading={isLoading}
      onApplyChanges={handleApplyChanges}
    />
  );
  
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
               <FileExplorer files={files} activeFileId={activeFileId} onFileSelect={handleFileSelect} onUploadClick={handleUploadClick} />
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex-1 overflow-y-auto p-4">
          {editor}
          <div className="mt-4">
            {outputPanel}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background text-foreground flex">
      <FileExplorer files={files} activeFileId={activeFileId} onFileSelect={handleFileSelect} onUploadClick={handleUploadClick} />
      <main className="flex-1 flex gap-4 p-4 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          {editor}
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          {outputPanel}
        </div>
      </main>
    </div>
  );
}
