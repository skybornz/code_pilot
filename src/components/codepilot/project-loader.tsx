
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import type { CodeFile } from './types';
import type { Project, NewProject } from '@/lib/project-database';
import { getProjects, addProject, deleteProject } from '@/actions/projects';
import { fetchBitbucketBranches, loadBitbucketFiles } from '@/actions/github';
import { Loader2, PlusCircle, Trash2, FolderGit2, GitBranch, FolderGit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { Label } from '../ui/label';
import { BitbucketCredsDialog } from '../profile/bitbucket-creds-dialog';
import { LoadingSpinner } from '../ui/loading-spinner';

interface ProjectLoaderProps {
  onFilesLoaded: (files: Partial<CodeFile>[], project: Project, branch: string) => void;
}

export function ProjectLoader({ onFilesLoaded }: ProjectLoaderProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [isBitbucketDialogOpen, setIsBitbucketDialogOpen] = useState(false);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const userProjects = await getProjects(user.id);
    setProjects(userProjects);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleAddProject = (project: Project) => {
    setProjects(prev => [...prev, project]);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!user) return;
    await deleteProject(projectId, user.id);
    setProjects(prev => prev.filter(p => p.id !== projectId));
  };

  if (!user) {
    return (
      <div className="flex flex-1 w-full items-center justify-center">
        <LoadingSpinner text="Waiting for user session..." />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 w-full items-center justify-center">
        <LoadingSpinner text="Loading projects..." />
      </div>
    );
  }

  return (
    <div className="h-full w-full container mx-auto p-8 flex flex-col">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-4">
            <div className="flex items-start gap-4">
                <div className="p-2 bg-purple-500/10 rounded-full">
                    <FolderGit className="h-8 w-8 text-purple-400" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold text-purple-400">
                        Repo Analyzer
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Select a project to load or add a new one.
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="outline" onClick={() => setIsBitbucketDialogOpen(true)} className="text-purple-400 border-current hover:bg-purple-500/10 hover:text-purple-400">
                    <GitBranch className="mr-2 h-4 w-4" />
                    Configuration
                </Button>
                <Dialog open={isAddProjectDialogOpen} onOpenChange={setIsAddProjectDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Project
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                        <DialogTitle>Add New Bitbucket Project</DialogTitle>
                        </DialogHeader>
                        <AddProjectForm onProjectAdded={(project) => {
                        handleAddProject(project);
                        setIsAddProjectDialogOpen(false);
                        }} />
                    </DialogContent>
                </Dialog>
            </div>
        </div>
      
        <div className="flex-1">
            {projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map(project => (
                    <ProjectCard 
                    key={project.id} 
                    project={project}
                    onDelete={handleDeleteProject}
                    onFilesLoaded={onFilesLoaded}
                    />
                ))}
                </div>
            ) : (
                 <div className="h-full flex flex-1 items-center justify-center">
                    <div className="text-center text-muted-foreground">
                        <FolderGit2 className="mx-auto h-12 w-12 mb-4" />
                        <p>No projects yet.</p>
                        <p>Click "Add Project" to get started.</p>
                    </div>
                </div>
            )}
        </div>

      <BitbucketCredsDialog open={isBitbucketDialogOpen} onOpenChange={setIsBitbucketDialogOpen} />
    </div>
  );
}

function AddProjectForm({ onProjectAdded }: { onProjectAdded: (project: Project) => void }) {
  const [repoName, setRepoName] = useState('');
  const [projectKey, setProjectKey] = useState(process.env.NEXT_PUBLIC_BITBUCKET_SERVER_PROJECT || '');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const host = process.env.NEXT_PUBLIC_BITBUCKET_SERVER_HOST;
  const previewUrl = repoName.trim() && host && projectKey.trim() ? `${host}/projects/${projectKey.trim()}/repos/${repoName.trim()}` : '';

  const handleValidateAndAdd = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to add a project.' });
      return;
    }
    if (!repoName.trim()) {
      toast({ variant: 'destructive', title: 'Repository Name Required' });
      return;
    }
     if (!projectKey.trim()) {
      toast({ variant: 'destructive', title: 'Project Key Required' });
      return;
    }
    
    setIsLoading(true);

    const newProjectData: NewProject = { 
        name: repoName, 
        projectKey: projectKey,
        url: '', 
        userId: user.id 
    };
    const addResult = await addProject(newProjectData);

    if (addResult.success && addResult.project) {
      toast({ title: 'Project Added!', description: `Successfully added "${repoName}".` });
      onProjectAdded(addResult.project);
    } else {
      toast({ variant: 'destructive', title: 'Failed to Add Project', description: addResult.message });
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-4 py-2">
       <div className="space-y-1">
        <Label htmlFor="repoName">Repository Name</Label>
        <Input
          id="repoName"
          placeholder="my-awesome-repo"
          value={repoName}
          onChange={e => setRepoName(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="projectKey">Project Key</Label>
        <Input
          id="projectKey"
          placeholder="PROJ"
          value={projectKey}
          onChange={e => setProjectKey(e.target.value)}
          disabled={isLoading}
        />
      </div>

      {previewUrl && (
        <div className="text-xs text-muted-foreground bg-muted p-2 rounded-md break-all">
          <p className="font-medium text-foreground mb-1">Full URL Preview:</p>
          {previewUrl}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <DialogClose asChild>
          <Button variant="ghost">Cancel</Button>
        </DialogClose>
        <Button onClick={handleValidateAndAdd} disabled={isLoading || !repoName.trim() || !projectKey.trim()} className="bg-purple-600 hover:bg-purple-700 text-white">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Project
        </Button>
      </div>
    </div>
  );
}

function ProjectCard({ project, onDelete, onFilesLoaded }: { project: Project, onDelete: (id: string) => void, onFilesLoaded: ProjectLoaderProps['onFilesLoaded'] }) {
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFetchBranches = async () => {
    if (!user) return;
    setIsLoadingBranches(true);
    const result = await fetchBitbucketBranches(project.url, user.id);
    setIsLoadingBranches(false);

    if (result.success && result.branches) {
      setBranches(result.branches);
      if (result.branches.length > 0) {
        setSelectedBranch(result.branches[0]);
      }
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error || `Could not fetch branches for ${project.name}.` });
    }
  };

  const handleLoadProject = async () => {
    if (!selectedBranch || !user) return;
    
    setIsLoadingFiles(true);
    const { id, update } = toast({ title: 'Importing Repository...', description: 'Please wait while we fetch the project files.' });
    
    const result = await loadBitbucketFiles(project.url, selectedBranch, user.id);
    setIsLoadingFiles(false);

    if (result.success && result.files) {
      update({ id, title: 'Import Successful', description: `Loaded ${result.files.length} files from root.` });
      onFilesLoaded(result.files, project, selectedBranch);
    } else {
      update({ id, variant: 'destructive', title: 'Import Failed', description: result.error });
    }
  };
  
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start justify-between pb-4">
        <div>
          <CardTitle className="text-xl">{project.name}</CardTitle>
          <CardDescription className="text-xs break-all">{project.url}</CardDescription>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => onDelete(project.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-end space-y-2">
        {branches.length > 0 ? (
          <>
            <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={isLoadingFiles}>
              <SelectTrigger>
                <SelectValue placeholder="Select a branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleLoadProject} disabled={isLoadingFiles || !selectedBranch} className="bg-purple-600 hover:bg-purple-700 text-white">
              {isLoadingFiles && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Load Project
            </Button>
          </>
        ) : (
          <Button onClick={handleFetchBranches} disabled={isLoadingBranches} className="bg-purple-600 hover:bg-purple-700 text-white">
            {isLoadingBranches && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Select Branch to Load
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
