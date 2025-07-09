
'use client';

import { useState, useCallback } from 'react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FlaskConical, Play, Terminal, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { EditorView } from '@codemirror/view';
import { ScrollArea } from '@/components/ui/scroll-area';

// For now, only JS is supported for client-side execution
const supportedLanguages = [
    { value: 'javascript', label: 'JavaScript' },
];

export default function CodeFiddlePage() {
    const [code, setCode] = useState('console.log("Hello, Fiddle!");\nconsole.log({ a: 1, b: "test" });');
    const [language, setLanguage] = useState('javascript');
    const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    const onCodeChange = useCallback((value: string) => {
        setCode(value);
    }, []);

    const handleRunCode = () => {
        if (language !== 'javascript') {
            setConsoleOutput(['Only JavaScript execution is currently supported.']);
            return;
        }

        setIsRunning(true);
        setConsoleOutput([]);
        const capturedLogs: string[] = [];

        // Temporarily override console.log to capture output
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
            // Use Function constructor to safely execute the code
            new Function(code)();
        } catch (error: any) {
            capturedLogs.push(`Error: ${error.message}`);
        } finally {
            // Restore original console.log and update state
            console.log = originalConsoleLog;
            setConsoleOutput(capturedLogs);
            setIsRunning(false);
        }
    };

    const handleClearConsole = () => {
        setConsoleOutput([]);
    }

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
                                        A lightweight playground to write, run, and test code snippets directly in your browser.
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
                                        <Select value={language} onValueChange={setLanguage}>
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
                                        <Play className="mr-2 h-4 w-4" />
                                        Run
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 p-0">
                                <CodeMirror
                                    value={code}
                                    height="100%"
                                    theme={vscodeDark}
                                    extensions={[javascript({ jsx: true, typescript: true }), EditorView.lineWrapping]}
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
                                                <div key={index} className={`whitespace-pre-wrap border-b border-border/50 py-1 ${line.startsWith('Error:') ? 'text-red-400' : ''}`}>
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
