'use client';

import type { CodeFile } from '@/components/codepilot/types';
import { FileCode, Folder, Upload, ChevronRight, UserCircle, LogOut, Settings } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/card';
import { Logo } from './logo';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useMemo } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';

interface FileExplorerProps {
  files: CodeFile[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onUploadClick: () => void;
}

type FileTreeNode = {
    [key: string]: {
        type: 'file';
        file: CodeFile;
    } | {
        type: 'folder';
        path: string;
        children: FileTreeNode;
    }
};

const buildFileTree = (files: CodeFile[]): FileTreeNode => {
    const tree: FileTreeNode = {};
    files.forEach(file => {
        const pathParts = file.id.split('/');
        let currentLevel: any = tree;
        pathParts.forEach((part, index) => {
            if (!currentLevel[part]) {
                if (index === pathParts.length - 1) {
                    currentLevel[part] = { type: 'file', file: file };
                } else {
                    const currentPath = pathParts.slice(0, index + 1).join('/');
                    currentLevel[part] = { type: 'folder', path: currentPath, children: {} };
                }
            }
            if (currentLevel[part].type === 'folder') {
                currentLevel = currentLevel[part].children;
            }
        });
    });
    return tree;
};


interface FileTreeViewProps {
    tree: FileTreeNode;
    activeFileId: string | null;
    onFileSelect: (fileId: string) => void;
    level?: number;
}

const FileTreeView = ({ tree, activeFileId, onFileSelect, level = 0 }: FileTreeViewProps) => {
    const sortedEntries = Object.entries(tree).sort(([aName, aValue], [bName, bValue]) => {
        if (aValue.type === 'folder' && bValue.type === 'file') return -1;
        if (aValue.type === 'file' && bValue.type === 'folder') return 1;
        return aName.localeCompare(bName);
    });

    return (
        <div className="space-y-0.5">
            {sortedEntries.map(([name, node]) => {
                if (node.type === 'folder') {
                    return (
                        <Collapsible key={node.path} defaultOpen className="group">
                            <CollapsibleTrigger 
                                className="w-full flex items-center gap-2 text-left py-1.5 rounded-md hover:bg-sidebar-accent/50 text-sm"
                                style={{ paddingLeft: `${level * 1.25}rem` }}
                            >
                                <ChevronRight className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                                <Folder className="w-4 h-4 text-accent flex-shrink-0" />
                                <span className="truncate">{name}</span>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <FileTreeView
                                    tree={node.children}
                                    activeFileId={activeFileId}
                                    onFileSelect={onFileSelect}
                                    level={level + 1}
                                />
                            </CollapsibleContent>
                        </Collapsible>
                    );
                } else {
                    return (
                        <button
                            key={node.file.id}
                            onClick={() => onFileSelect(node.file.id)}
                            className={`w-full text-left py-1.5 rounded-md flex items-center gap-2 transition-colors text-sm ${
                                activeFileId === node.file.id
                                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                                    : 'hover:bg-sidebar-accent/50'
                            }`}
                            style={{ paddingLeft: `${level * 1.25 + 1.25}rem` }}
                        >
                            <FileCode className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate" title={node.file.name}>{node.file.name}</span>
                        </button>
                    );
                }
            })}
        </div>
    );
};


export function FileExplorer({ files, activeFileId, onFileSelect, onUploadClick }: FileExplorerProps) {
    const fileTree = useMemo(() => buildFileTree(files), [files]);
    const { user, isAdmin, logout } = useAuth();
  
    return (
    <TooltipProvider>
      <aside className="h-full w-full md:w-72 flex flex-col bg-sidebar-background border-r border-sidebar-border">
        <div className="p-4 border-b border-sidebar-border">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          <div className="flex justify-between items-center mb-2 px-2">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Folder className="w-5 h-5" />
                  <span>Project Files</span>
              </h2>
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={onUploadClick} aria-label="Load another project">
                          <Upload className="w-4 h-4" />
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                      <p>Load another project</p>
                  </TooltipContent>
              </Tooltip>
          </div>
          
          <FileTreeView tree={fileTree} activeFileId={activeFileId} onFileSelect={onFileSelect} />
        </div>
        <div className="p-2 border-t border-sidebar-border">
          {user && (
              <Card className="bg-card/50">
                  <CardHeader className="p-3 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                          <UserCircle className="w-6 h-6 flex-shrink-0" />
                          <div className="text-sm overflow-hidden">
                              <p className="font-semibold truncate">{user.email}</p>
                              <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-1">
                          {isAdmin && (
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                          <Link href="/admin">
                                              <Settings className="w-4 h-4" />
                                          </Link>
                                      </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Admin Settings</p></TooltipContent>
                              </Tooltip>
                          )}
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={logout}>
                                      <LogOut className="w-4 h-4" />
                                  </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Logout</p></TooltipContent>
                          </Tooltip>
                  </div>
              </CardHeader>
          </Card>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
