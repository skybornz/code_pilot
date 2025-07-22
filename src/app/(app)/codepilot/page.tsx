
'use client';

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { EditorPanel } from '@/components/codepilot/editor-panel';
import { AIOutputPanel } from '@/components/codepilot/ai-output-panel';
import { CopilotChatPanel } from '@/components/codepilot/copilot-chat-panel';
import type { CodeFile, AIOutput, ActionType } from '@/components/codepilot/types';
import type { Message } from '@/ai/flows/copilot-chat';
import { useAuth } from '@/context/auth-context';
import { performAiAction } from '@/actions/ai';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Upload, FileTerminal } from 'lucide-react';
import { GenerateTestDialog } from '@/components/codepilot/generate-test-dialog';

const initialFile: CodeFile = {
  id: 'local-file',
  name: 'untitled.txt',
  language: 'plaintext',
  type: 'file',
  content: '',
};

const supportedLanguages = [
    { value: 'plaintext', label: 'Plain Text' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'tsx', label: 'TSX' },
    { value: 'jsx', label: 'JSX' },
    { value: 'python', label: 'Python' },
    { value: 'c', label: 'C' },
    { value: 'cpp', label: 'C++' },
    { value: 'csharp', label: 'C#' },
    { value: 'java', label: 'Java' },
    { value: 'css', label: 'CSS' },
    { value: 'json', label: 'JSON' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'html', label: 'HTML' },
];

const languageKeywords: { [key: string]: { patterns: RegExp[], score: number } } = {
  tsx: { patterns: [/\b(import|export)\s+.*\s+from\s+['"]react['"]/, /<[A-Z][a-zA-Z0-9]*\s*.*>/, /:\s*\w+Props/, /const\s+\w+\s*:\s*React.FC/], score: 5 },
  jsx: { patterns: [/\b(import|export)\s+.*\s+from\s+['"]react['"]/, /<[A-Z][a-zA-Z0-9]*\s*.*>/, /React.createElement/], score: 4 },
  typescript: { patterns: [/\b(interface|type|enum|public|private|protected)\b/, /:\s*\w+[;\[\]]/, /<\w+>/], score: 3 },
  cpp: { patterns: [/^#include\s*<iostream>/m, /\bstd::(cout|cin|endl)\b/, /\b(int|void)\s+main\s*\(/], score: 4 },
  csharp: { patterns: [/\busing\s+System;/, /\b(namespace|class|public|static|void)\b/], score: 3 },
  java: { patterns: [/\bimport\s+java\./, /\b(public|static|void)\s+main\s*\(/, /System\.out\.println/], score: 3 },
  python: { patterns: [/^def\s+\w+\s*\(.*\):/m, /^import\s+/, /^from\s+.*import\s+/m, /__name__\s*==\s*['"]__main__['"]/], score: 3 },
  c: { patterns: [/^#include\s*<stdio\.h>/m, /\b(printf|scanf|malloc|free)\s*\(/], score: 2 },
  javascript: { patterns: [/const\s+\w+\s*=\s*require\(/, /module\.exports/, /console\.log\(/, /function\s*\*?/, /=>/], score: 1 },
  html: { patterns: [/<!DOCTYPE\s+html>/i, /<html.*>/i, /<head.*>/i, /<body.*>/i], score: 3 },
  css: { patterns: [/body\s*\{/, /#\w+\s*\{/, /\.\w+\s*\{/, /@media/], score: 3 },
};

function detectLanguage(code: string): string {
    if (!code || code.trim().length === 0) {
        return 'plaintext';
    }

    let maxScore = 0;
    let detectedLang = 'plaintext';

    for (const lang in languageKeywords) {
        let currentScore = 0;
        const { patterns, score: baseScore } = languageKeywords[lang];
        for (const pattern of patterns) {
            if (pattern.test(code)) {
                currentScore += baseScore;
            }
        }
        if (currentScore > maxScore) {
            maxScore = currentScore;
            detectedLang = lang;
        }
    }
    
    // Add a threshold to avoid incorrect detection for very short snippets
    if (maxScore < 2 && code.length < 50) {
        return 'plaintext';
    }

    return detectedLang;
}

export default function CodePilotPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [activeFile, setActiveFile] = useState<CodeFile>(initialFile);
    const [aiOutput, setAiOutput] = useState<AIOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [rightPanelView, setRightPanelView] = useState<'ai-output' | 'copilot-chat'>('copilot-chat');
    const [copilotChatMessages, setCopilotChatMessages] = useState<Message[]>([
        { role: 'model', content: "Hello! Paste or upload your code, then ask me anything." }
    ]);
    const [analysisChatMessages, setAnalysisChatMessages] = useState<Message[]>([]);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
    
    const detectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleCodeChange = (fileId: string, newContent: string) => {
        // Since we only have one file, we can directly update it.
        setActiveFile(prev => ({ ...prev, content: newContent }));

        if (detectionTimeoutRef.current) {
            clearTimeout(detectionTimeoutRef.current);
        }

        detectionTimeoutRef.current = setTimeout(() => {
            const detectedLang = detectLanguage(newContent);
            if (activeFile && detectedLang !== activeFile.language && supportedLanguages.some(l => l.value === detectedLang)) {
                handleLanguageChange(detectedLang);
            }
        }, 500); // Debounce detection to avoid rapid changes while typing
    };

    const handleLanguageChange = (language: string) => {
        if (activeFile) {
            const fileExtension = language.split('.').pop();
            const newName = activeFile.name.includes('.') ? activeFile.name.replace(/\.[^/.]+$/, `.${fileExtension}`) : `${activeFile.name}.${fileExtension}`;
            setActiveFile(prev => ({ ...prev, language, name: newName }));
        }
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                const fileExtension = file.name.split('.').pop() || 'plaintext';
                const language = supportedLanguages.find(l => l.value === fileExtension)?.value || 'plaintext';
                const newFile: CodeFile = {
                    id: `local-file-${Date.now()}`,
                    name: file.name,
                    language: language,
                    type: 'file',
                    content: content,
                };
                setActiveFile(newFile);
            };
            reader.readAsText(file);
        }
    };
    
    const triggerFileLoad = () => {
        fileInputRef.current?.click();
    };

    const handleAiAction = useCallback(async (action: ActionType, code: string, language: string, originalCode?: string, dependencies?: { name: string; content: string }[], remarks?: string) => {
        if (!user || !activeFile) return;
        setIsLoading(true);
        setAnalysisChatMessages([]);
        setRightPanelView('ai-output');
        
        const result = await performAiAction(user.id, action, code, language, originalCode, activeFile.name, dependencies, remarks);

        if ('error' in result) {
            toast({ variant: 'destructive', title: 'AI Action Failed', description: result.error });
        } else {
            const outputWithContext: AIOutput = { ...result, fileContext: { id: activeFile.id, name: activeFile.name } };
            setAiOutput(outputWithContext);
        }
        setIsLoading(false);
    }, [toast, user, activeFile]);

    const handleGenerateTest = useCallback((dependencies: { name: string; content: string }[], remarks: string) => {
        if (activeFile?.content) {
            handleAiAction('test', activeFile.content, activeFile.language, undefined, dependencies, remarks);
        }
    }, [activeFile, handleAiAction]);

    const handleShowCopilotChat = () => {
        setRightPanelView('copilot-chat');
    };
    
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
                return null;
        }
    };

    return (
        <div className="theme-codepilot h-screen flex flex-col bg-background">
            <DashboardHeader />
            <main className="flex-1 flex flex-col overflow-hidden">
                 <div className="container mx-auto flex-1 flex flex-col p-4 min-h-0">
                    <div className="flex-shrink-0 flex items-center justify-between gap-4 border-b pb-4 mb-4">
                        <h1 className="text-xl font-semibold text-blue-400 flex items-center gap-2">
                            <FileTerminal className="h-6 w-6" />
                            <span>Code Pilot</span>
                        </h1>
                        <div className="flex items-center gap-4">
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                            <Button variant="outline" onClick={triggerFileLoad} className="text-blue-400 border-current hover:bg-blue-400/10 hover:text-blue-400">
                                <Upload className="mr-2 h-4 w-4" />
                                Upload File
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 flex gap-4 min-h-0">
                        <div className="w-1/2 flex flex-col">
                            {activeFile ? (
                                <EditorPanel
                                    file={activeFile}
                                    onCodeChange={handleCodeChange}
                                    onAiAction={handleAiAction}
                                    isLoading={isLoading}
                                    onCommitChange={() => {}} // Not used in this context
                                    handleShowCopilotChat={handleShowCopilotChat}
                                    viewMode={'edit'}
                                    setViewMode={() => {}} // Not used in this context
                                    onGenTestClick={() => setIsTestDialogOpen(true)}
                                />
                            ) : null}
                        </div>
                        <div className="w-1/2 flex flex-col">
                            {rightPanelContent()}
                        </div>
                    </div>
                </div>
            </main>
            {activeFile && (
                <GenerateTestDialog
                    open={isTestDialogOpen}
                    onOpenChange={setIsTestDialogOpen}
                    activeFile={activeFile}
                    otherOpenFiles={[]} // No other files to depend on in this mode
                    onGenerate={handleGenerateTest}
                />
            )}
        </div>
    );
}
