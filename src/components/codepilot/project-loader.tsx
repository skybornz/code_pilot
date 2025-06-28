'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { CodeFile } from './types';
import { UploadCloud, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProjectLoaderProps {
  onFilesLoaded: (files: CodeFile[]) => void;
}

export function ProjectLoader({ onFilesLoaded }: ProjectLoaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) {
      return;
    }

    const loadedFiles: CodeFile[] = [];
    try {
      for (const file of Array.from(uploadedFiles)) {
        // Skip directories if they are part of the list (some browsers might include them)
        if (file.size === 0 && (file.type === '' || file.type === 'application/octet-stream')) {
          const isDirectory = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(false);
            reader.onerror = () => resolve(true);
            reader.readAsDataURL(file);
          });
          if(isDirectory) continue;
        }

        const content = await file.text();
        const language = file.name.split('.').pop() || 'text';
        loadedFiles.push({
          id: (file as any).webkitRelativePath || file.name,
          name: file.name,
          language,
          content,
        });
      }
      onFilesLoaded(loadedFiles);
    } catch (error) {
      console.error('Error reading files:', error);
      toast({
        variant: 'destructive',
        title: 'Error reading files',
        description: 'Could not read the selected folder. Please try again.',
      });
    }
  };

  const handleUrlImport = () => {
    toast({
      title: 'Feature not available',
      description: 'Importing from a URL is not yet implemented.',
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Load Your Project</CardTitle>
          <CardDescription>Upload a local folder or import from a public Git repository.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upload">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="gap-2">
                <UploadCloud className="h-4 w-4" /> Upload Folder
              </TabsTrigger>
              <TabsTrigger value="url" className="gap-2">
                <LinkIcon className="h-4 w-4" /> From URL
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="mt-6">
              <div className="flex flex-col items-center justify-center space-y-4 p-8 border-2 border-dashed border-border rounded-lg text-center">
                <UploadCloud className="h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">Click the button to select a project folder from your computer.</p>
                <Button onClick={() => fileInputRef.current?.click()}>
                  Select Folder
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFolderUpload}
                  className="hidden"
                  webkitdirectory="true"
                  directory="true"
                  multiple
                />
              </div>
            </TabsContent>
            <TabsContent value="url" className="mt-6">
               <div className="space-y-4 p-4 border border-border rounded-lg">
                <Input type="text" placeholder="https://github.com/user/repo" />
                <Button onClick={handleUrlImport} className="w-full">
                  Import from Repository
                </Button>
               </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
