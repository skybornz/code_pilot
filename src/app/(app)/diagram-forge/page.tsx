
'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Workflow, Sparkles, Loader2, FilePenLine, Download, Image, Info } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { generateDiagramFromPrompt } from '@/actions/diagram';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DiagramPreview } from '@/components/diagram/diagram-preview';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { EditorView } from '@codemirror/view';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const diagramTypes = [
  { value: 'flowchart', label: 'Flowchart' },
  { value: 'sequenceDiagram', label: 'Sequence Diagram' },
  { value: 'gantt', label: 'Gantt Chart' },
  { value: 'classDiagram', label: 'Class Diagram' },
  { value: 'erDiagram', label: 'ER Diagram (Database)' },
  { value: 'stateDiagram-v2', label: 'State Diagram' },
  { value: 'pie', label: 'Pie Chart' },
];

export default function DiagramForgePage() {
  const [prompt, setPrompt] = useState('');
  const [diagramType, setDiagramType] = useState('flowchart');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [diagramKey, setDiagramKey] = useState(0); // To force re-render of preview
  const { user } = useAuth();
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not logged in' });
      return;
    }
    setIsLoading(true);
    setGeneratedCode('');

    const result = await generateDiagramFromPrompt(user.id, prompt, diagramType);

    if ('error' in result) {
      toast({ variant: 'destructive', title: 'AI Generation Failed', description: result.error });
    } else {
      setGeneratedCode(result.diagramCode);
      setDiagramKey(k => k + 1); // Increment key to force preview re-render
    }
    setIsLoading(false);
  };
  
  const handleCodeChange = (code: string) => {
    setGeneratedCode(code);
    setDiagramKey(k => k + 1);
  };

  const handleDownload = () => {
    const svgElement = document.querySelector('#diagram-preview-container .mermaid > svg');
    if (svgElement) {
        // Create a temporary clone to modify for light theme download
        const lightSvg = svgElement.cloneNode(true) as SVGSVGElement;
        lightSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        lightSvg.style.backgroundColor = 'white'; // Explicitly set background
        
        const svgData = new XMLSerializer().serializeToString(lightSvg);
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'diagram.svg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } else {
        toast({
            variant: 'destructive',
            title: 'Download Error',
            description: 'Could not find the diagram SVG to download. Please generate a diagram first.'
        });
    }
  };

  return (
    <div className="theme-diagram-forge min-h-screen flex flex-col bg-background">
      <DashboardHeader />
      <main className="flex-1 container mx-auto p-8">
        <div className="w-full mx-auto space-y-8">
          <Card className="bg-card/50">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-cyan-500/10 rounded-full">
                  <Workflow className="h-8 w-8 text-cyan-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-semibold text-cyan-400">Diagram Forge</CardTitle>
                  <CardDescription>
                    Describe a process, system, or structure in plain English, and the forge will craft a diagram for you.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                   <Label htmlFor="prompt-input">Diagram Description</Label>
                   <Textarea
                    id="prompt-input"
                    placeholder='e.g., "User sends request to API Gateway, which forwards to a Lambda function. The function reads from a DynamoDB table and returns the result."'
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isLoading}
                    className="min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="diagram-type-select">Diagram Type</Label>
                    <Select value={diagramType} onValueChange={setDiagramType} disabled={isLoading}>
                      <SelectTrigger id="diagram-type-select">
                        <SelectValue placeholder="Select a diagram type" />
                      </SelectTrigger>
                      <SelectContent>
                        {diagramTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
              </div>
               <div className="flex justify-center pt-4">
                  <Button onClick={handleGenerate} disabled={!prompt || isLoading} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                    ) : (
                      <><Sparkles className="mr-2 h-4 w-4" /> Generate Diagram</>
                    )}
                  </Button>
                </div>
            </CardContent>
          </Card>

          {(isLoading || generatedCode) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Side: Editor */}
                <Card className="bg-card/50">
                    <CardHeader className="flex flex-row items-start justify-between">
                        <div>
                            <CardTitle className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
                                <FilePenLine />
                                Mermaid Code Editor
                            </CardTitle>
                            <CardDescription>You can edit the generated code here to refine your diagram.</CardDescription>
                        </div>
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-400">
                                    <Info className="h-5 w-5" />
                                    <span className="sr-only">Mermaid Syntax Info</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-96" side="left" align="start">
                                <div className="grid gap-4">
                                  <div className="space-y-2">
                                    <h4 className="font-medium leading-none">Mermaid Cheatsheet</h4>
                                    <p className="text-sm text-muted-foreground">
                                      Basic syntax for common diagrams.
                                    </p>
                                  </div>
                                  <div className="grid gap-2 text-xs">
                                    <h5 className="font-semibold">Flowchart</h5>
                                    <pre className="p-2 rounded-md bg-muted"><code>{`graph TD;
    A[Start] --> B(Process);
    B --> C{{Decision}};
    C -->|Yes| D[End];
    C -->|No| B;`}</code></pre>
                                    <h5 className="font-semibold mt-2">Sequence Diagram</h5>
                                    <pre className="p-2 rounded-md bg-muted"><code>{`sequenceDiagram;
    User->>API: Request;
    API->>DB: Query;
    DB-->>API: Results;
    API-->>User: Response;`}</code></pre>
                                    <h5 className="font-semibold mt-2">Pie Chart</h5>
                                    <pre className="p-2 rounded-md bg-muted"><code>{`pie
    title Page Views
    "Home": 45,
    "Docs": 25,
    "Admin": 10;`}</code></pre>
                                  </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </CardHeader>
                    <CardContent>
                       {isLoading && !generatedCode ? (
                            <div className="flex items-center justify-center h-full min-h-[300px]">
                                <LoadingSpinner text="Generating diagram code..." />
                            </div>
                        ) : (
                           <CodeMirror
                                value={generatedCode}
                                height="400px"
                                theme={vscodeDark}
                                extensions={[markdown(), EditorView.lineWrapping]}
                                onChange={handleCodeChange}
                                basicSetup={{
                                  lineNumbers: true,
                                  foldGutter: true,
                                  autocompletion: false,
                                }}
                                style={{ fontSize: '0.875rem' }}
                            />
                        )}
                    </CardContent>
                </Card>

                {/* Right Side: Preview */}
                <Card className="bg-card/50 h-full flex flex-col">
                  <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
                            <Image className="h-5 w-5" />
                            Preview
                        </CardTitle>
                        <CardDescription>Your rendered diagram appears here.</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleDownload} disabled={!generatedCode} className="text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-400">
                        <Download className="h-5 w-5" />
                        <span className="sr-only">Download SVG</span>
                    </Button>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-0 p-4">
                     <div id="diagram-preview-container" className="h-full w-full rounded-md bg-white p-4">
                        <DiagramPreview key={diagramKey} code={generatedCode} />
                     </div>
                  </CardContent>
                </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
