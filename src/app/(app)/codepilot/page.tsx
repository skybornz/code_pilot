
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
import { Upload } from 'lucide-react';

const initialFile: CodeFile = {
  id: 'local-file',
  name: 'untitled.txt',
  language: 'plaintext',
  type: 'file',
  content: '// Paste your code here or upload a file to start analyzing.',
};

const supportedLanguages = [
    { value: 'plaintext', label: 'Plain Text' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'tsx', label: 'TSX' },
    { value: 'jsx', label: 'JSX' },
    { value: 'python', label: 'Python' },
    { value: 'css', label: 'CSS' },
    { value: 'json', label: 'JSON' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'html', label: 'HTML' },
];

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

    const handleCodeChange = (fileId: string, newContent: string) => {
        setActiveFile(prev => ({ ...prev, content: newContent }));
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
        <div className="theme-codepilot min-h-screen flex flex-col bg-background">
            <DashboardHeader />
            <main className="flex-1 flex p-4 overflow-hidden">
                <div className="container mx-auto flex flex-col flex-1 gap-4">
                    <div className="flex-shrink-0 flex items-center justify-between gap-4 border-b pb-4">
                        <h1 className="text-lg font-semibold text-purple-400">Code Pilot</h1>
                        <div className="flex items-center gap-4">
                            <div className="w-48">
                                <Select value={activeFile.language} onValueChange={handleLanguageChange}>
                                <SelectTrigger>
                                        <SelectValue placeholder="Select language..." />
                                </SelectTrigger>
                                <SelectContent>
                                        {supportedLanguages.map(lang => (
                                            <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                                        ))}
                                </SelectContent>
                                </Select>
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                            <Button variant="outline" onClick={triggerFileLoad}>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload File
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 flex gap-4 min-h-0">
                        <div className="flex-1 flex flex-col min-w-0">
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
                        <div className="flex-1 flex flex-col min-w-0">
                            {rightPanelContent()}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
