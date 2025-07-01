
'use client';

import React, { useState } from 'react';
import type { CodeFile } from '@/components/codepilot/types';
import { FileCode, Folder, Upload, ChevronRight, UserCircle, LogOut, Settings, KeyRound, MoreVertical, GitBranch, Loader2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/card';
import { Logo } from './logo';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useMemo } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import type { Project } from '@/lib/project-database';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChangePasswordDialog } from '../profile/change-password-dialog';
import { BitbucketCredsDialog } from '../profile/bitbucket-creds-dialog';

interface FileExplorerProps {
  files: CodeFile[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onSwitchProject: () => void;
  onFolderExpand: (folderId: string) => void;
  project?: Project;
  branch?: string;
}

type FileTreeNode = {
    [key: string]: CodeFile & { children?: FileTreeNode };
};

const buildFileTree = (files: CodeFile[]): FileTreeNode => {
  const tree: FileTreeNode = {};

  files.forEach(file => {
    // For each file, reduce its path parts into the tree structure.
    file.id.split('/').reduce((currentLevel, part, index, pathParts) => {
      const isLastPart = index === pathParts.length - 1;
      
      // Check if the node for the current path part exists.
      if (!currentLevel[part]) {
        // If the node doesn't exist, create it.
        if (isLastPart) {
          // If it's the last part of the path, it's the actual file/folder from the API.
          // We use its data directly.
          currentLevel[part] = { ...file, name: part, children: file.type === 'folder' ? {} : undefined };
        } else {
          // If it's an intermediate part of the path, create a synthetic folder
          // to represent the directory structure.
          const syntheticPath = pathParts.slice(0, index + 1).join('/');
          currentLevel[part] = {
            id: syntheticPath,
            name: part,
            type: 'folder',
            language: 'folder',
            childrenLoaded: true, // It's considered 'loaded' as we are building its children from the current file list.
            children: {},
          };
        }
      } else if (isLastPart) {
        // If the node *does* exist and it's the last part, it means a synthetic folder
        // was created by a deeper file path earlier. Now we have the *actual* data
        // for that folder, so we merge the real properties into it.
        Object.assign(currentLevel[part], {
          ...file,
          name: part,
          children: currentLevel[part].children || (file.type === 'folder' ? {} : undefined),
        });
      }

      // For the next iteration of the reducer, return the children of the current node.
      // This makes the reducer effectively descend one level deeper into the tree.
      // If a path conflict occurs (e.g., a file is where a folder should be),
      // returning an empty object prevents crashes.
      return currentLevel[part]?.children || {};
    }, tree); // Start the reduction with the root of the tree.
  });

  return tree;
};


interface FileTreeViewProps {
    tree: FileTreeNode;
    activeFileId: string | null;
    onFileSelect: (fileId: string) => void;
    onFolderExpand: (folderId: string) => void;
    level?: number;
}

const FileTreeView = ({ tree, activeFileId, onFileSelect, onFolderExpand, level = 0 }: FileTreeViewProps) => {
    const [loadingFolder, setLoadingFolder] = useState<string | null>(null);

    const handleExpand = async (isOpen: boolean, node: CodeFile) => {
        if (isOpen && !node.childrenLoaded) {
            setLoadingFolder(node.id);
            await onFolderExpand(node.id);
            setLoadingFolder(null);
        }
    };
    
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
                        <Collapsible 
                            key={node.id} 
                            defaultOpen={level < 1} // Auto-expand root level
                            className="group"
                            onOpenChange={(isOpen) => handleExpand(isOpen, node)}
                        >
                            <CollapsibleTrigger 
                                className="w-full flex items-center gap-2 text-left py-1.5 rounded-md hover:bg-sidebar-accent/50 text-sm"
                                style={{ paddingLeft: `${level * 1.25}rem` }}
                            >
                                <ChevronRight className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                                {loadingFolder === node.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                                ) : (
                                    <Folder className="w-4 h-4 text-accent flex-shrink-0" />
                                )}
                                <span>{name}</span>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                {node.children && (
                                     <FileTreeView
                                        tree={node.children}
                                        activeFileId={activeFileId}
                                        onFileSelect={onFileSelect}
                                        onFolderExpand={onFolderExpand}
                                        level={level + 1}
                                    />
                                )}
                            </CollapsibleContent>
                        </Collapsible>
                    );
                } else {
                    return (
                        <button
                            key={node.id}
                            onClick={() => onFileSelect(node.id)}
                            className={`w-full text-left py-1.5 rounded-md flex items-center gap-2 transition-colors text-sm ${
                                activeFileId === node.id
                                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                                    : 'hover:bg-sidebar-accent/50'
                            }`}
                            style={{ paddingLeft: `${level * 1.25 + 1.25}rem` }}
                        >
                            <FileCode className="w-4 h-4 flex-shrink-0" />
                            <span title={node.name}>{node.name}</span>
                        </button>
                    );
                }
            })}
        </div>
    );
};


export function FileExplorer({ files, activeFileId, onFileSelect, onSwitchProject, onFolderExpand, project, branch }: FileExplorerProps) {
    const fileTree = useMemo(() => buildFileTree(files), [files]);
    const { user, isAdmin, logout } = useAuth();
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = React.useState(false);
    const [isBitbucketDialogOpen, setIsBitbucketDialogOpen] = React.useState(false);
  
    return (
    <>
      <aside className="h-full w-full md:w-72 flex flex-col bg-sidebar-background border-r border-sidebar-border">
        <div className="p-4 border-b border-sidebar-border">
          <Logo />
        </div>
        <div className="flex-1 overflow-auto p-4 min-h-0">
          <div className="flex justify-between items-center mb-2">
              {project && branch ? (
                <div className="overflow-hidden mr-2">
                  <h2 className="text-lg font-semibold truncate" title={project.name}>{project.name}</h2>
                  <p className="text-xs text-muted-foreground truncate">Branch: {branch}</p>
                </div>
              ) : (
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Folder className="w-5 h-5" />
                    <span>Project Files</span>
                </h2>
              )}
              <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={onSwitchProject} aria-label="Switch project">
                              <Upload className="w-4 h-4" />
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                          <p>Switch project</p>
                      </TooltipContent>
                  </Tooltip>
              </TooltipProvider>
          </div>
          <div className="w-max min-w-full mt-4">
            <FileTreeView tree={fileTree} activeFileId={activeFileId} onFileSelect={onFileSelect} onFolderExpand={onFolderExpand} />
          </div>
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
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                  <MoreVertical className="h-4 w-4" />
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              {isAdmin && (
                                  <>
                                      <DropdownMenuItem asChild>
                                          <Link href="/admin">
                                              <Settings className="mr-2 h-4 w-4" />
                                              <span>Admin Dashboard</span>
                                          </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                  </>
                              )}
                              <DropdownMenuItem onClick={() => setIsBitbucketDialogOpen(true)}>
                                  <GitBranch className="mr-2 h-4 w-4" />
                                  <span>Bitbucket Credentials</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setIsPasswordDialogOpen(true)}>
                                  <KeyRound className="mr-2 h-4 w-4" />
                                  <span>Change Password</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={logout}>
                                  <LogOut className="mr-2 h-4 w-4" />
                                  <span>Logout</span>
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                  </CardHeader>
              </Card>
          )}
        </div>
      </aside>
      {user && <ChangePasswordDialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen} userId={user.id} />}
      {user && <BitbucketCredsDialog open={isBitbucketDialogOpen} onOpenChange={setIsBitbucketDialogOpen} />}
    </>
  );
}
