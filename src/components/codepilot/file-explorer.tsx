
'use client';

import React, { useMemo, useState, useCallback } from 'react';
import type { CodeFile } from '@/components/codepilot/types';
import { FileCode, Folder, Upload, ChevronRight, UserCircle, LogOut, Settings, KeyRound, MoreVertical, GitBranch, Loader2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/card';
import { Logo } from './logo';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import type { Project } from '@/lib/project-database';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChangePasswordDialog } from '../profile/change-password-dialog';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';

// This will be the internal representation for the tree
type FileTreeNode = CodeFile & {
  children: FileTreeNode[];
};

const buildFileTree = (files: CodeFile[]): FileTreeNode[] => {
    const nodeMap: { [key: string]: FileTreeNode } = {};

    // First pass: Create nodes for every file and every one of its parent directories.
    // This ensures that parent folders exist before we try to link children to them.
    files.forEach(file => {
        const pathParts = file.id.split('/');
        let currentPath = '';
        pathParts.forEach((part, index) => {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            if (!nodeMap[currentPath]) {
                const isActualFileNode = index === pathParts.length - 1;
                nodeMap[currentPath] = {
                    // Use the full file data for the actual file node, but create synthetic folders for parents
                    ...(isActualFileNode ? file : {}),
                    id: currentPath,
                    name: part,
                    type: isActualFileNode ? file.type : 'folder',
                    language: isActualFileNode ? file.language : 'folder',
                    children: [],
                };
            }
        });
    });

    // Second pass: Link children to their parents.
    const rootNodes: FileTreeNode[] = [];
    Object.values(nodeMap).forEach(node => {
        const pathParts = node.id.split('/');
        if (pathParts.length > 1) {
            const parentPath = pathParts.slice(0, -1).join('/');
            const parentNode = nodeMap[parentPath];
            if (parentNode) {
                // Check for duplicates before pushing, as the algorithm might process a path multiple times.
                if (!parentNode.children.some(child => child.id === node.id)) {
                    parentNode.children.push(node);
                }
            }
        } else {
            rootNodes.push(node);
        }
    });

    // Final pass: Sort all children arrays recursively for consistent ordering.
    const sortChildrenRecursively = (nodes: FileTreeNode[]) => {
        nodes.sort((a, b) => {
            if (a.type === 'folder' && b.type === 'file') return -1;
            if (a.type === 'file' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name);
        });
        nodes.forEach(node => {
            if (node.children) {
                sortChildrenRecursively(node.children);
            }
        });
    };
    
    sortChildrenRecursively(rootNodes);

    return rootNodes;
};

// Recursive component to render the tree
const FileTreeView = ({
  nodes,
  activeFileId,
  onFileSelect,
  onFolderExpand,
  level = 0
}: {
  nodes: FileTreeNode[];
  activeFileId: string | null;
  onFileSelect: (id: string) => void;
  onFolderExpand: (id: string) => void;
  level?: number;
}) => {
  if (!nodes || nodes.length === 0) {
    return null;
  }

  return (
    <div className={cn(level > 0 && "pl-4")}>
      {nodes.map((node) => (
        <FileTreeItem
          key={node.id}
          node={node}
          activeFileId={activeFileId}
          onFileSelect={onFileSelect}
          onFolderExpand={onFolderExpand}
        />
      ))}
    </div>
  );
};


const FileTreeItem = ({
  node,
  activeFileId,
  onFileSelect,
  onFolderExpand,
}: {
  node: FileTreeNode;
  activeFileId: string | null;
  onFileSelect: (id: string) => void;
  onFolderExpand: (id: string) => void;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFolderClick = async () => {
    setIsExpanded(!isExpanded);
    if (!node.childrenLoaded && !isExpanded) {
      setIsLoading(true);
      await onFolderExpand(node.id);
      setIsLoading(false);
    }
  };

  const commonClasses = "flex items-center gap-2 w-full p-1 rounded-md text-sm cursor-pointer hover:bg-sidebar-accent";
  
  if (node.type === 'folder') {
    return (
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
            <div className={cn(commonClasses)} onClick={handleFolderClick}>
                <ChevronRight className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-90')} />
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Folder className="w-4 h-4 text-accent" />}
                <span className="truncate">{node.name}</span>
            </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
           <FileTreeView nodes={node.children} activeFileId={activeFileId} onFileSelect={onFileSelect} onFolderExpand={onFolderExpand} level={1} />
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div
      className={cn(commonClasses, activeFileId === node.id && 'bg-sidebar-accent')}
      onClick={() => onFileSelect(node.id)}
    >
      <span className="w-4 h-4" /> {/* Spacer to align with folder icons */}
      <FileCode className="w-4 h-4" />
      <span className="truncate">{node.name}</span>
    </div>
  );
};

export function FileExplorer({ files, activeFileId, onFileSelect, onSwitchProject, onFolderExpand, project, branch }: any) {
    const tree = useMemo(() => buildFileTree(files), [files]);
    const { user, isAdmin, logout } = useAuth();
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

    return (
    <>
      <aside className="h-full w-full md:w-72 flex flex-col bg-sidebar-background border-r border-sidebar-border">
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          <Link href="/dashboard" aria-label="Back to Dashboard">
            <Logo />
          </Link>
            {project && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={onSwitchProject} aria-label="Switch project">
                                <Upload className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="end">
                            <p>Switch Project</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        </div>
        <ScrollArea className="flex-1 p-2 min-h-0">
          <div className="flex justify-between items-center mb-2 px-2">
              {project && branch && (
                <div className="overflow-hidden mr-2 flex-1 min-w-0">
                  <h2 className="text-lg font-semibold truncate" title={project.name}>{project.name}</h2>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <p className="text-xs text-muted-foreground truncate cursor-default">Branch: {branch}</p>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{branch}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
              )}
          </div>
          <div className="space-y-0.5">
            <FileTreeView
                nodes={tree}
                activeFileId={activeFileId}
                onFileSelect={onFileSelect}
                onFolderExpand={onFolderExpand}
            />
          </div>
        </ScrollArea>
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
    </>
  );
}
