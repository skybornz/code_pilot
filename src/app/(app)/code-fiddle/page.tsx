
'use client';

import { useState, useCallback, useMemo } from 'react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FlaskConical, Play, Terminal, Trash2, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { EditorView } from '@codemirror/view';
import { ScrollArea } from '@/components/ui/scroll-area';
import { simulateCodeExecution } from '@/actions/code-fiddle';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';

const supportedLanguages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'c', label: 'C' },
    { value: 'cpp', label: 'C++' },
    { value: 'csharp', label: 'C#' },
    { value: 'java', label: 'Java' },
];

const getLanguageExtension = (language: string) => {
    switch (language) {
        case 'python':
            return [python()];
        case 'javascript':
        case 'c':
        case 'cpp':
        case 'csharp':
        case 'java':
        default:
            return [javascript({ jsx: true, typescript: true })];
    }
};

export default function CodeFiddlePage() {
    const [code, setCode] = useState('print("Hello from Python!")');
    const [language, setLanguage] = useState('python');
    const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const { user } = useAuth();
    const { toast } = useToast();

    const onCodeChange = useCallback((value: string) => {
        setCode(value);
    }, []);
    
    const handleLanguageChange = (lang: string) => {
        setLanguage(lang);
        switch(lang) {
            case 'python':
                setCode('print("Hello from Python!")');
                break;
            case 'javascript':
                setCode('console.log("Hello from JavaScript!");');
                break;
            case 'c':
                setCode('#include <stdio.h>\\n\\nint main() {\\n   printf("Hello from C!\\\\n");\\n   return 0;\\n}');
                break;
            case 'cpp':
                setCode('#include <iostream>\\n\\nint main() {\\n   std::cout << "Hello from C++!" << std::endl;\\n   return 0;\\n}');
                break;
            case 'csharp':
                setCode('using System;\\n\\nclass Program {\\n   static void Main() {\\n      Console.WriteLine("Hello from C#!");\\n   }\\n}');
                break;
            case 'java':
                setCode('public class HelloWorld {\\n   public static void main(String[] args) {\\n      System.out.println("Hello from Java!");\\n   }\\n}');
                break;
            default:
                setCode('');
                break;
        }
    };

    const handleRunCode = async () => {
        setIsRunning(true);
        setConsoleOutput([]);

        if (language === 'javascript') {
            runJavaScript();
            setIsRunning(false);
        } else {
            await runOnServer();
            setIsRunning(false);
        }
    };
    
    const runJavaScript = () => {
        const capturedLogs: string[] = [];
        const originalConsoleLog = console.log;
        console.log = (...args: any[]) => {
            const formattedArgs = args.map(arg => {
                if (typeof arg === 'object' && arg !== null) {
                    try {
                        return JSON.stringify(arg, null, 2);
                    } catch (e) {
                        return '[Unserializable Object]';
                    }
                }
                return String(arg);
            }).join(' ');
            capturedLogs.push(formattedArgs);
        };
        try {
            new Function(code)();
        } catch (error: any) {
            capturedLogs.push(`Error: ${error.message}`);
        } finally {
            console.log = originalConsoleLog;
            setConsoleOutput(capturedLogs);
        }
    };

    const runOnServer = async () => {
        if (!user) {
            toast({ variant: 'destructive', title: `You must be logged in to run ${language} code.` });
            return;
        }
        
        const result = await simulateCodeExecution(user.id, code, language);

        if ('error' in result && result.error !== null) {
             setConsoleOutput([`Execution Error: ${result.error}`]);
        } else if ('output' in result) {
             setConsoleOutput([result.output]);
        } else {
             setConsoleOutput(['An unexpected error occurred.']);
        }
    };

    const handleClearConsole = () => {
        setConsoleOutput([]);
    }
    
    const extensions = useMemo(() => [
        ...getLanguageExtension(language),
        EditorView.lineWrapping,
    ], [language]);

    return (
        <div className="theme-code-fiddle min-h-screen flex flex-col bg-background">
            <DashboardHeader />
            <main className="flex-1 container mx-auto p-8">
                <div className="w-full max-w-7xl mx-auto space-y-8">
                    <Card className="bg-card/50">
                        <CardHeader>
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-yellow-500/10 rounded-full">
                                    <FlaskConical className="h-8 w-8 text-yellow-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-semibold text-yellow-400">Code Fiddle</CardTitle>
                                    <CardDescription>
                                        A lightweight playground to write, run, and test code snippets. For many languages, AI simulates the output.
                                    </CardDescription>
                                    <CardDescription className="text-xs pt-2">
                                        Disclaimer: AI simulations can be incorrect. Always verify critical code.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[60vh]">
                        {/* Editor Panel */}
                        <Card className="bg-card/50 flex flex-col">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg">Editor</CardTitle>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-40">
                                        <Select value={language} onValueChange={handleLanguageChange}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select language" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {supportedLanguages.map(lang => (
                                                    <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button onClick={handleRunCode} disabled={isRunning} className="bg-yellow-600 hover:bg-yellow-700 text-white">
                                        {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                                        Run
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 p-0">
                                <CodeMirror
                                    value={code}
                                    height="100%"
                                    theme={vscodeDark}
                                    extensions={extensions}
                                    onChange={onCodeChange}
                                    basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: true }}
                                    className="h-full"
                                />
                            </CardContent>
                        </Card>

                        {/* Console Panel */}
                        <Card className="bg-card/50 flex flex-col">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Terminal className="h-5 w-5" />
                                    Console
                                </CardTitle>
                                <Button variant="ghost" size="icon" onClick={handleClearConsole} className="text-muted-foreground hover:text-foreground">
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Clear Console</span>
                                </Button>
                            </CardHeader>
                            <CardContent className="flex-1 p-0 bg-muted/20 rounded-b-lg">
                                <ScrollArea className="h-full">
                                    <div className="p-4 font-mono text-xs text-foreground">
                                        {consoleOutput.length === 0 ? (
                                            <p className="text-muted-foreground">Output will appear here...</p>
                                        ) : (
                                            consoleOutput.map((line, index) => (
                                                <div key={index} className={`whitespace-pre-wrap border-b border-border/50 py-1 ${line.toLowerCase().includes('error') ? 'text-red-400' : ''}`}>
                                                    {line}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
