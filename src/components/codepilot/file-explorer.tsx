'use client';

import type { CodeFile } from '@/lib/dummy-data';
import { FileCode, Folder } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Logo } from './logo';

interface FileExplorerProps {
  files: CodeFile[];
  activeFileId: string;
  onFileSelect: (fileId: string) => void;
}

export function FileExplorer({ files, activeFileId, onFileSelect }: FileExplorerProps) {
  return (
    <aside className="h-full w-full md:w-72 flex flex-col bg-sidebar-background border-r border-sidebar-border">
      <div className="p-4 border-b border-sidebar-border">
        <Logo />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Folder className="w-5 h-5" />
          <span>Project Files</span>
        </h2>
        <ul className="space-y-1">
          {files.map((file) => (
            <li key={file.id}>
              <button
                onClick={() => onFileSelect(file.id)}
                className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 transition-colors text-sm ${
                  activeFileId === file.id
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'hover:bg-sidebar-accent/50'
                }`}
              >
                <FileCode className="w-4 h-4" />
                <span>{file.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="p-4 border-t border-sidebar-border">
          <Card className="bg-card/50">
            <CardHeader className="p-3">
              <p className="text-xs text-muted-foreground">Local Ollama Model</p>
            </CardHeader>
            <CardContent className="p-3 pt-0">
               <p className="text-sm font-medium">gemini-2.0-flash</p>
               <p className="text-xs text-muted-foreground mt-1">Connected</p>
            </CardContent>
          </Card>
      </div>
    </aside>
  );
}
