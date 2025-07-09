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

const contentTypes = [
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

export default function WordCraftPage() {
  const [originalText, setOriginalText] = useState('');
  const [refinedText, setRefinedText] = useState('');
  const [contentType, setContentType] = useState('Business Email');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleRefine = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not logged in' });
      return;
    }
    if (!originalText.trim()) {
        toast({ variant: 'destructive', title: 'Input required', description: 'Please enter some text to refine.' });
        return;
    }
    setIsLoading(true);
    setRefinedText('');

    const result = await refineTextAction(user.id, originalText, contentType);

    if ('error' in result) {
      toast({ variant: 'destructive', title: 'AI Refinement Failed', description: result.error });
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
                  <CardTitle className="text-2xl font-semibold text-indigo-400">Word Craft</CardTitle>
                  <CardDescription>
                    Paste your text, select a content type, and let AI refine your writing.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-3 space-y-2">
                        <Label htmlFor="content-type-select">Content Type</Label>
                        <Select value={contentType} onValueChange={setContentType} disabled={isLoading}>
                            <SelectTrigger id="content-type-select">
                                <SelectValue placeholder="Select a content type" />
                            </SelectTrigger>
                            <SelectContent>
                                {contentTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="original-text">Original Text</Label>
                        <Textarea
                            id="original-text"
                            placeholder="Paste your draft here..."
                            className="min-h-[300px] font-sans"
                            value={originalText}
                            onChange={(e) => setOriginalText(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="refined-text">Refined Text</Label>
                        <div className="relative">
                            <Textarea
                                id="refined-text"
                                placeholder="Refined text will appear here..."
                                className="min-h-[300px] font-sans"
                                value={refinedText}
                                readOnly
                                disabled={isLoading}
                            />
                            {refinedText && (
                                <Button variant="ghost" size="icon" onClick={handleCopy} className="absolute top-2 right-2 h-7 w-7">
                                    {isCopied ? <ClipboardCheck className="h-4 w-4 text-green-400" /> : <Clipboard className="h-4 w-4" />}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
                <div className="mt-4 flex justify-center">
                  <Button onClick={handleRefine} disabled={!originalText || isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Refining...</>
                    ) : (
                      <><Sparkles className="mr-2 h-4 w-4" /> Refine Text</>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoading && (
            <Card className="bg-card/50">
              <CardContent className="flex items-center justify-center p-12">
                <LoadingSpinner text="The AI is refining your text..." />
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
