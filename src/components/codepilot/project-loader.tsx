'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CodeFile } from './types';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchBitbucketBranches, loadBitbucketFiles } from '@/actions/github';

const BitbucketIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M2.66 2.479a.998.998 0 0 0-.911.993v16.907c0 .548.421.993.945.993h14.288c.348 0 .668-.18.845-.46l4.24-6.832a.993.993 0 0 0 0-1.125l-4.24-6.831a.998.998 0 0 0-.845-.46L2.694 2.48a.22.22 0 0 0-.034 0zM9.01 17.584h2.443l1.83-11.166H8.353l-1.928 6.96h5.052l-2.467 4.206z"></path>
    </svg>
);

interface ProjectLoaderProps {
  onFilesLoaded: (files: CodeFile[]) => void;
}

export function ProjectLoader({ onFilesLoaded }: ProjectLoaderProps) {
  const [repoUrl, setRepoUrl] = useState('');
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  
  const { toast } = useToast();

  const handleFetchBranches = async () => {
    if (!repoUrl.trim()) {
      toast({ variant: 'destructive', title: 'URL Required', description: 'Please enter a public Bitbucket repository URL.' });
      return;
    }
    
    setIsLoadingBranches(true);
    setBranches([]);
    setSelectedBranch(null);
    const result = await fetchBitbucketBranches(repoUrl);
    setIsLoadingBranches(false);

    if (result.success && result.branches) {
      setBranches(result.branches);
      toast({ title: 'Branches Loaded', description: 'Please select a branch to continue.' });
    } else {
      toast({ variant: 'destructive', title: 'Failed to Fetch Branches', description: result.error });
    }
  };

  const handleLoadProject = async () => {
    if (!repoUrl || !selectedBranch) {
        toast({ variant: 'destructive', title: 'Branch Required', description: 'Please select a branch first.' });
        return;
    }

    setIsLoadingFiles(true);
    const { id, update } = toast({ title: 'Importing Repository...', description: 'Please wait while we fetch the project files.' });
    
    const result = await loadBitbucketFiles(repoUrl, selectedBranch);
    setIsLoadingFiles(false);

    if (result.success && result.files) {
      update({ id, title: 'Import Successful', description: `Loaded ${result.files.length} files from the repository.` });
      onFilesLoaded(result.files);
    } else {
      update({ id, variant: 'destructive', title: 'Import Failed', description: result.error });
    }
  };
  
  const isLoading = isLoadingBranches || isLoadingFiles;

  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <Card className="w-full max-w-lg shadow-2xl bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Load Your Project</CardTitle>
          <CardDescription>
            Import a public Bitbucket repository to start coding with your AI partner.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-grow">
                    <BitbucketIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        type="text" 
                        placeholder="https://bitbucket.org/workspace/repo"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        disabled={isLoading || branches.length > 0}
                        onKeyDown={(e) => { if(e.key === 'Enter') handleFetchBranches() }}
                        className="pl-10"
                    />
                </div>
                <Button onClick={handleFetchBranches} disabled={isLoading || !repoUrl.trim()}>
                  {isLoadingBranches && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Fetch Branches
                </Button>
              </div>

              {branches.length > 0 && (
                <div className="space-y-4">
                    <Select onValueChange={setSelectedBranch} disabled={isLoading}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a branch" />
                        </SelectTrigger>
                        <SelectContent>
                            {branches.map(branch => (
                                <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button onClick={handleLoadProject} className="w-full" disabled={isLoading || !selectedBranch}>
                      {isLoadingFiles && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Load Project Files
                    </Button>
                </div>
              )}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
