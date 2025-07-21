
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import type { CodeFile } from './types';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';

interface GenerateTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeFile: CodeFile;
  otherOpenFiles: CodeFile[];
  onGenerate: (framework: string, dependencies: { name: string; content: string }[]) => void;
}

const frameworkOptions: { [key: string]: { value: string; label: string }[] } = {
  typescript: [
    { value: 'jest', label: 'Jest' },
    { value: 'vitest', label: 'Vitest' },
  ],
  javascript: [
    { value: 'jest', label: 'Jest' },
    { value: 'vitest', label: 'Vitest' },
  ],
  python: [
    { value: 'pytest', label: 'Pytest' },
    { value: 'unittest', label: 'Unittest' },
  ],
  java: [
    { value: 'junit', label: 'JUnit' },
  ],
  csharp: [
    { value: 'nunit', label: 'NUnit' },
    { value: 'xunit', label: 'xUnit' },
  ]
};

const GenerateTestDialogMemo = ({
  open,
  onOpenChange,
  activeFile,
  otherOpenFiles,
  onGenerate,
}: GenerateTestDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [framework, setFramework] = useState('');
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);

  const availableFrameworks = useMemo(() => {
    return frameworkOptions[activeFile.language] || [];
  }, [activeFile.language]);

  useEffect(() => {
    if (open) {
      // Reset state when dialog opens and set default framework
      const currentFrameworks = frameworkOptions[activeFile.language] || [];
      setFramework(currentFrameworks.length > 0 ? currentFrameworks[0].value : '');
      setSelectedDependencies([]);
    }
  }, [open, activeFile.language]);

  const handleDependencyToggle = (fileId: string) => {
    setSelectedDependencies(prev => 
        prev.includes(fileId) 
            ? prev.filter(id => id !== fileId) 
            : [...prev, fileId]
    );
  };

  const handleGenerateClick = () => {
    setIsLoading(true);
    const dependenciesToSend = otherOpenFiles
        .filter(file => selectedDependencies.includes(file.id))
        .map(file => ({ name: file.name, content: file.content || '' }));

    onGenerate(framework, dependenciesToSend);

    // Close dialog after a short delay to show loading state
    setTimeout(() => {
      onOpenChange(false);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Generate Unit Test</DialogTitle>
          <DialogDescription>
            Configure the details for the unit test generation for your file.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label>File to Test</Label>
                <div className="flex items-center gap-2 rounded-md border p-3">
                    <span className="font-semibold">{activeFile.name}</span>
                    <Badge variant="secondary">{activeFile.language}</Badge>
                </div>
            </div>

            {availableFrameworks.length > 0 && (
                 <div className="space-y-2">
                    <Label htmlFor="framework-select">Testing Framework</Label>
                    <Select value={framework} onValueChange={setFramework}>
                        <SelectTrigger id="framework-select">
                            <SelectValue placeholder="Select a framework" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableFrameworks.map(fw => (
                                <SelectItem key={fw.value} value={fw.value}>{fw.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 </div>
            )}
            
            {otherOpenFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Dependencies</Label>
                <p className="text-xs text-muted-foreground">Select any open files that the file-to-test depends on to improve generation accuracy.</p>
                <ScrollArea className="h-32 rounded-md border">
                    <div className="p-4 space-y-2">
                    {otherOpenFiles.map(file => (
                        <div key={file.id} className="flex items-center space-x-2">
                            <Checkbox
                                id={`dep-${file.id}`}
                                checked={selectedDependencies.includes(file.id)}
                                onCheckedChange={() => handleDependencyToggle(file.id)}
                            />
                            <label
                                htmlFor={`dep-${file.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                {file.name}
                            </label>
                        </div>
                    ))}
                    </div>
                </ScrollArea>
              </div>
            )}
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleGenerateClick} disabled={isLoading || (availableFrameworks.length > 0 && !framework)}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const GenerateTestDialog = React.memo(GenerateTestDialogMemo);
