
'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { PenLine, Sparkles, Loader2, Clipboard, ClipboardCheck } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { refineTextAction } from '@/actions/word-craft';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MessageContent } from '@/components/codepilot/message-content';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';

const draftContentTypes = [
  { value: 'Business Email', label: 'Business Email' },
  { value: 'Personal Email', label: 'Personal Email' },
  { value: 'Technical Report', label: 'Technical Report' },
  { value: 'Executive Summary', label: 'Executive Summary' },
  { value: 'Academic Paper', label: 'Academic Paper' },
  { value: 'API Documentation', label: 'API Documentation' },
  { value: 'User Guide', label: 'User Guide' },
  { value: 'Technical RFC', label: 'Technical RFC' },
  { value: 'Design Document', label: 'Design Document' },
];

const analyzeOptions = [
    { value: 'summarize', label: 'Summarize Document' },
    { value: 'translate', label: 'Translate Content' },
    { value: 'insight', label: 'Provide Insight' },
];

const targetLanguages = [
    { value: 'English', label: 'English' },
    { value: 'Korean', label: 'Korean' },
    { value: 'Chinese', label: 'Chinese' },
    { value: 'Spanish', label: 'Spanish' },
    { value: 'French', label: 'French' },
];

export default function WordCraftPage() {
  const [originalText, setOriginalText] = useState('');
  const [template, setTemplate] = useState('');
  const [refinedText, setRefinedText] = useState('');
  const [mode, setMode] = useState<'draft' | 'analyze' | 'template'>('draft');
  const [contentType, setContentType] = useState('Business Email');
  const [analyzeType, setAnalyzeType] = useState('summarize');
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [enhance, setEnhance] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleAction = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not logged in' });
      return;
    }
    const isTemplateMode = mode === 'template';
    if (!originalText.trim() && !isTemplateMode) {
        toast({ variant: 'destructive', title: 'Input required', description: 'Please enter some text.' });
        return;
    }
     if (isTemplateMode && (!originalText.trim() || !template.trim())) {
        toast({ variant: 'destructive', title: 'Input required', description: 'Please provide both content and a template.' });
        return;
    }

    setIsLoading(true);
    setRefinedText('');

    const action = mode === 'draft' 
      ? contentType 
      : mode === 'analyze'
      ? `${analyzeType}${analyzeType === 'translate' ? ` to ${targetLanguage}` : ''}`
      : 'use-template'; // Special action for template mode
      
    const result = await refineTextAction(user.id, originalText, action, mode === 'template' ? template : undefined, mode === 'template' ? enhance : undefined);

    if ('error' in result) {
      toast({ variant: 'destructive', title: 'AI Action Failed', description: result.error });
    } else {
      setRefinedText(result.refinedText);
    }
    setIsLoading(false);
  };
  
  const handleCopy = () => {
    if (!refinedText) return;
    navigator.clipboard.writeText(refinedText);
    setIsCopied(true);
    toast({ title: "Refined text copied to clipboard!" });
    setTimeout(() => setIsCopied(false), 2000);
  };

  const getButtonText = () => {
    if (isLoading) return 'Processing...';
    if (mode === 'analyze') {
        switch(analyzeType) {
            case 'summarize': return 'Summarize';
            case 'translate': return 'Translate';
            case 'insight': return 'Get Insights';
            default: return 'Analyze';
        }
    }
    if (mode === 'template') {
        return enhance ? 'Enhance & Generate' : 'Generate from Template';
    }
    return 'Refine Text';
  }

  const renderInputPanel = () => {
    if (mode === 'template') {
        return (
            <div className="space-y-8">
                <Card className="bg-card/50">
                    <CardHeader>
                        <CardTitle className="text-lg text-indigo-400">Template</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            placeholder="e.g., Meeting Title: {Title}&#10;Attendees: {List of names}&#10;Summary: {A brief summary}"
                            className="min-h-[150px] font-sans"
                            value={template}
                            onChange={(e) => setTemplate(e.target.value)}
                            disabled={isLoading}
                        />
                    </CardContent>
                </Card>
                <Card className="bg-card/50">
                    <CardHeader className="flex-row justify-between items-center">
                        <CardTitle className="text-lg text-indigo-400">Content</CardTitle>
                        <div className="flex items-center space-x-2">
                            <Switch id="enhance-mode" checked={enhance} onCheckedChange={setEnhance} disabled={isLoading} />
                            <Label htmlFor="enhance-mode">Enhance Content</Label>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            placeholder="Provide the content or data points here..."
                            className="min-h-[150px] font-sans"
                            value={originalText}
                            onChange={(e) => setOriginalText(e.target.value)}
                            disabled={isLoading}
                        />
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <Card className="bg-card/50">
            <CardHeader>
                <CardTitle className="text-lg text-indigo-400">Original Text</CardTitle>
            </CardHeader>
            <CardContent>
                <Textarea
                    placeholder="Paste your text here..."
                    className="min-h-[300px] font-sans"
                    value={originalText}
                    onChange={(e) => setOriginalText(e.target.value)}
                    disabled={isLoading}
                />
            </CardContent>
        </Card>
    )
  }

  const renderOutputPanel = () => (
    <Card className="bg-card/50 h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-indigo-400">AI Output</CardTitle>
              {refinedText && !isLoading && (
                <Button variant="ghost" size="icon" onClick={handleCopy} className="h-7 w-7">
                    {isCopied ? <ClipboardCheck className="h-4 w-4 text-green-400" /> : <Clipboard className="h-4 w-4" />}
                </Button>
            )}
        </CardHeader>
        <CardContent className="flex-1 min-h-0">
          {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <LoadingSpinner text="The AI is working its magic..." />
              </div>
          ) : refinedText ? (
            <ScrollArea className="h-full">
              <div className="p-4 pr-6">
                <MessageContent content={refinedText} />
              </div>
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[300px]">
                <p className="text-muted-foreground">AI output will appear here.</p>
            </div>
          )}
        </CardContent>
    </Card>
  )

  return (
    <div className="theme-word-craft min-h-screen flex flex-col bg-background">
      <DashboardHeader />
      <main className="flex-1 container mx-auto p-8">
        <div className="w-full max-w-7xl mx-auto space-y-8">
          <Card className="bg-card/50">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-indigo-500/10 rounded-full">
                  <PenLine className="h-8 w-8 text-indigo-400" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold text-indigo-400">Word Craft</CardTitle>
                  <CardDescription>
                    An AI-powered text refinement tool that adapts to different content types.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <RadioGroup defaultValue="draft" onValueChange={(value: 'draft' | 'analyze' | 'template') => setMode(value)} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="draft" id="draft-mode" />
                        <Label htmlFor="draft-mode">Draft</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="analyze" id="analyze-mode" />
                        <Label htmlFor="analyze-mode">Analyze</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="template" id="template-mode" />
                        <Label htmlFor="template-mode">Use Template</Label>
                    </div>
                </RadioGroup>

                {mode === 'draft' ? (
                     <div className="space-y-2">
                        <Label htmlFor="content-type-select" className="text-indigo-400">Refine as</Label>
                        <Select value={contentType} onValueChange={setContentType} disabled={isLoading}>
                            <SelectTrigger id="content-type-select" className="w-full">
                                <SelectValue placeholder="Select a content type" />
                            </SelectTrigger>
                            <SelectContent>
                                {draftContentTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                ) : mode === 'analyze' ? (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="analyze-type-select" className="text-indigo-400">Analysis Type</Label>
                            <Select value={analyzeType} onValueChange={setAnalyzeType} disabled={isLoading}>
                                <SelectTrigger id="analyze-type-select" className="w-full">
                                    <SelectValue placeholder="Select an analysis type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {analyzeOptions.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {analyzeType === 'translate' && (
                             <div className="space-y-2">
                                <Label htmlFor="target-language-select" className="text-indigo-400">Target Language</Label>
                                <Select value={targetLanguage} onValueChange={setTargetLanguage} disabled={isLoading}>
                                    <SelectTrigger id="target-language-select" className="w-full">
                                        <SelectValue placeholder="Select language" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {targetLanguages.map((lang) => (
                                            <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                ) : null}
                

                <div className="mt-4 flex justify-center">
                  <Button onClick={handleAction} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[200px]">
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {getButtonText()}</>
                    ) : (
                      <><Sparkles className="mr-2 h-4 w-4" /> {getButtonText()}</>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {renderInputPanel()}
                {renderOutputPanel()}
           </div>
        </div>
      </main>
    </div>
  );
}
