'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { CodeFile } from './types';
import { Github, Loader2 } from 'lucide-react';
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
    <div className="flex flex-col items-center justify-center h-full w-full">
      <Card className="w-full max-w-lg shadow-2xl bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Load Your Project</CardTitle>
          <CardDescription>
            Import a public GitHub repository to start coding with your AI partner.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    type="text" 
                    placeholder="https://github.com/user/repo"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    disabled={isImporting}
                    onKeyDown={(e) => { if(e.key === 'Enter') handleUrlImport() }}
                    className="pl-10"
                />
              </div>
              <Button onClick={handleUrlImport} className="w-full" disabled={isImporting}>
                  {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isImporting ? 'Importing...' : 'Import Repository'}
              </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
