
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import type { CodeFile } from './types';


interface GenerateTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeFile: CodeFile;
  otherOpenFiles: CodeFile[];
  onGenerate: (framework: string, dependencies: { name: string; content: string }[]) => void;
}

const GenerateTestDialogMemo = ({
  open,
  onOpenChange,
  activeFile,
  otherOpenFiles,
  onGenerate,
}: GenerateTestDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateClick = () => {
    setIsLoading(true);
    // Pass empty values for now as the form is removed
    onGenerate('', []);

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
            This is a test to see if the dialog itself is causing the error.
          </DialogDescription>
        </DialogHeader>
        
        {/* All content has been removed for debugging */}
        <div className="py-4">
            <p>Dialog content removed.</p>
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
};

export const GenerateTestDialog = React.memo(GenerateTestDialogMemo);
