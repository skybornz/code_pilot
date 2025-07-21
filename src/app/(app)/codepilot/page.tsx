
'use client';

import React, { useState, useCallback, useRef } from 'react';
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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileTerminal } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  typescript: { patterns: [/: \w+;/, /interface\s+\w+/, /type\s+\w+\s*=/, /<[A-Z][a-zA-Z0-9]*>/, /public\s+(class|interface|enum)/, /private\s+/, /protected\s+/], score: 3 },
  javascript: { patterns: [/const\s+\w+\s*=\s*require\(/, /module\.exports/, /console\.log\(/, /function\*/, /=>/], score: 1 },
  python: { patterns: [/def\s+\w+\(/, /import\s+\w+/, /print\(/, /__name__\s*==\s*['"]__main__['"]/, /@\w+/], score: 3 },
  java: { patterns: [/public\s+static\s+void\s+main/, /System\.out\.println/, /import\s+java\./], score: 3 },
  csharp: { patterns: [/using\s+System;/, /namespace\s+\w+/, /Console\.WriteLine/], score: 3 },
  cpp: { patterns: [/#include\s*<iostream>/, /std::cout/], score: 2 },
  c: { patterns: [/#include\s*<stdio\.h>/, /printf\(/, /scanf\(/, /int\s+main\(/], score: 1 },
  css: { patterns: [/body\s*{/, /#\w+\s*{/, /\.\w+\s*{/, /@media/], score: 3 },
  html: { patterns: [/<!DOCTYPE\s+html>/i, /<html\s*>/i, /<head\s*>/i, /<body\s*>/i], score: 3 },
};

function detectLanguage(code: string): string {
    if (!code || code.trim().length === 0) {
        return 'plaintext';
    }

    let maxScore = 0;
    let detectedLang = 'plaintext';

    for (const lang in languageKeywords) {
        let currentScore = 0;
        const { patterns, score } = languageKeywords[lang];
        for (const pattern of patterns) {
            if (pattern.test(code)) {
                currentScore += score;
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
    
    const detectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleCodeChange = (fileId: string, newContent: string) => {
        setActiveFile(prev => ({ ...prev, content: newContent }));

        if (detectionTimeoutRef.current) {
            clearTimeout(detectionTimeoutRef.current);
        }

        detectionTimeoutRef.current = setTimeout(() => {
            const detectedLang = detectLanguage(newContent);
            if (detectedLang !== activeFile.language && supportedLanguages.some(l => l.value === detectedLang)) {
                handleLanguageChange(detectedLang);
            }
        }, 500); // Debounce detection to avoid rapid changes while typing
    };

    const handleLanguageChange = (language: string) => {
        const fileExtension = language.split('.').pop();
        const newName = activeFile.name.includes('.') ? activeFile.name.replace(/\.[^/.]+$/, `.${fileExtension}`) : `${activeFile.name}.${fileExtension}`;
        setActiveFile(prev => ({
            ...prev,
            language: language,
            name: newName,
        }));
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                const fileExtension = file.name.split('.').pop() || 'plaintext';
                const language = supportedLanguages.find(l => l.value === fileExtension)?.value || 'plaintext';
                setActiveFile({
                    id: 'local-file',
                    name: file.name,
                    language: language,
                    type: 'file',
                    content: content,
                });
            };
            reader.readAsText(file);
        }
    };
    
    const triggerFileLoad = () => {
        fileInputRef.current?.click();
    };

    const handleAiAction = useCallback(async (action: ActionType, code: string, language: string) => {
        if (!user) return;
        setIsLoading(true);
        setAnalysisChatMessages([]);
        setRightPanelView('ai-output');
        
        const result = await performAiAction(user.id, action, code, language, undefined, activeFile.name);

        if ('error' in result) {
            toast({ variant: 'destructive', title: 'AI Action Failed', description: result.error });
        } else {
            const outputWithContext: AIOutput = { ...result, fileContext: { id: activeFile.id, name: activeFile.name } };
            setAiOutput(outputWithContext);
        }
        setIsLoading(false);
    }, [toast, activeFile, user]);

    const handleShowCopilotChat = () => {
        setRightPanelView('copilot-chat');
    };

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
                return null;
        }
    };

    return (
        <div className="theme-codepilot h-screen flex flex-col bg-background">
            <DashboardHeader />
            <main className="flex-1 flex flex-col p-4 overflow-hidden">
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
                        <EditorPanel
                            file={activeFile}
                            onCodeChange={handleCodeChange}
                            onAiAction={handleAiAction}
                            isLoading={isLoading}
                            onCommitChange={() => {}} // Not used in this context
                            handleShowCopilotChat={handleShowCopilotChat}
                            viewMode={'edit'}
                            setViewMode={() => {}} // Not used in this context
                        />
                    </div>
                    <div className="w-1/2 flex flex-col">
                        {rightPanelContent()}
                    </div>
                </div>
            </main>
        </div>
    );
}
