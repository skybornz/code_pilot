
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, FileText, FileCode } from 'lucide-react';
import type { CodeFile } from './types';

interface GenerateTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeFile: CodeFile;
  otherOpenFiles: CodeFile[];
  onGenerate: (framework: string, dependencies: { name: string; content: string }[]) => void;
}

const frameworkMap: Record<string, { value: string; label: string }[]> = {
  javascript: [
    { value: 'jest', label: 'Jest' },
    { value: 'vitest', label: 'Vitest' },
    { value: 'mocha', label: 'Mocha' },
    { value: 'jasmine', label: 'Jasmine' },
  ],
  typescript: [
    { value: 'jest', label: 'Jest' },
    { value: 'vitest', label: 'Vitest' },
    { value: 'mocha', label: 'Mocha' },
  ],
  python: [
    { value: 'pytest', label: 'Pytest' },
    { value: 'unittest', label: 'unittest' },
  ],
  java: [
    { value: 'junit', label: 'JUnit' },
    { value: 'testng', label: 'TestNG' },
  ],
  csharp: [
    { value: 'nunit', label: 'NUnit' },
    { value: 'xunit', label: 'xUnit' },
    { value: 'mstest', label: 'MSTest' },
  ],
  // Add other languages here
};

export function GenerateTestDialog({
  open,
  onOpenChange,
  activeFile,
  otherOpenFiles,
  onGenerate,
}: GenerateTestDialogProps) {
  const [selectedFramework, setSelectedFramework] = useState('');
  const [selectedDeps, setSelectedDeps] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const availableFrameworks = frameworkMap[activeFile.language] || [];

  useEffect(() => {
    // Reset state when dialog opens or file changes
    if (open) {
      setSelectedFramework(availableFrameworks.length > 0 ? availableFrameworks[0].value : '');
      setSelectedDeps({});
    }
  }, [open, activeFile.language, availableFrameworks]);

  const handleGenerateClick = () => {
    setIsLoading(true);
    
    const dependencies = otherOpenFiles
      .filter(file => selectedDeps[file.id])
      .map(file => ({
        name: file.name,
        content: file.content || '', // Ensure content is not undefined
      }));

    onGenerate(selectedFramework, dependencies);

    // Give some time for AI to start
    setTimeout(() => {
        onOpenChange(false);
        setIsLoading(false);
    }, 1000);
  };

  const handleDepChange = (fileId: string) => {
    setSelectedDeps(prev => ({ ...prev, [fileId]: !prev[fileId] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Generate Unit Test</DialogTitle>
          <DialogDescription>
            Provide additional context to help the AI generate a more accurate test.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="file-name" className="text-right">File</Label>
            <div id="file-name" className="col-span-3 flex items-center gap-2">
                <FileCode className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{activeFile.name}</span>
                <span className="text-sm text-muted-foreground">({activeFile.language})</span>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="framework" className="text-right">Framework</Label>
            {availableFrameworks.length > 0 ? (
                <Select value={selectedFramework} onValueChange={setSelectedFramework}>
                    <SelectTrigger id="framework" className="col-span-3">
                        <SelectValue placeholder="Select a testing framework" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableFrameworks.map(fw => (
                            <SelectItem key={fw.value} value={fw.value}>{fw.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : (
                <p className="col-span-3 text-sm text-muted-foreground">No specific frameworks configured for {activeFile.language}.</p>
            )}
          </div>
          {otherOpenFiles.length > 0 && (
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Dependencies</Label>
              <div className="col-span-3">
                 <p className="text-xs text-muted-foreground mb-2">Select any files this code depends on to provide more context to the AI.</p>
                 <ScrollArea className="h-32 rounded-md border p-2">
                    <div className="space-y-2">
                        {otherOpenFiles.map(file => (
                            <div key={file.id} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`dep-${file.id}`}
                                    checked={!!selectedDeps[file.id]}
                                    onCheckedChange={() => handleDepChange(file.id)}
                                />
                                <label htmlFor={`dep-${file.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    {file.name}
                                </label>
                            </div>
                        ))}
                    </div>
                 </ScrollArea>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleGenerateClick} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
