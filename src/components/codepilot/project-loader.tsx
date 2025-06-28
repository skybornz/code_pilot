'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { CodeFile } from './types';
import { Link as LinkIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { importFromGithub } from '@/actions/github';

interface ProjectLoaderProps {
  onFilesLoaded: (files: CodeFile[]) => void;
}

export function ProjectLoader({ onFilesLoaded }: ProjectLoaderProps) {
  const [repoUrl, setRepoUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleUrlImport = async () => {
    if (!repoUrl.trim()) {
      toast({
        variant: 'destructive',
        title: 'URL Required',
        description: 'Please enter a public GitHub repository URL.',
      });
      return;
    }
    
    setIsImporting(true);
    const { id, update } = toast({
      title: 'Importing Repository...',
      description: 'Please wait while we fetch the project files.',
    });

    const result = await importFromGithub(repoUrl);

    setIsImporting(false);

    if (result.success && result.files) {
      update({
        id,
        title: 'Import Successful',
        description: `Loaded ${result.files.length} files from the repository.`,
      });
      onFilesLoaded(result.files);
    } else {
      update({
        id,
        variant: 'destructive',
        title: 'Import Failed',
        description: result.error,
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Load Your Project</CardTitle>
          <CardDescription>Import from a public GitHub repository to get started.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    <p className="font-medium text-sm">Import from URL</p>
                </div>
                <Input 
                    type="text" 
                    placeholder="https://github.com/user/repo"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    disabled={isImporting}
                    onKeyDown={(e) => { if(e.key === 'Enter') handleUrlImport() }}
                />
                <Button onClick={handleUrlImport} className="w-full" disabled={isImporting}>
                    {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isImporting ? 'Importing...' : 'Import from Repository'}
                </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
