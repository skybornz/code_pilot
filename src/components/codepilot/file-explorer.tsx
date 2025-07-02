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
import { BitbucketCredsDialog } from '../profile/bitbucket-creds-dialog';
import Tree from 'rc-tree';
import type { DataNode, Key } from 'rc-tree/lib/interface';

interface FileExplorerProps {
  files: CodeFile[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onSwitchProject: () => void;
  onFolderExpand: (folderId: string) => void;
  project?: Project;
  branch?: string;
}

// A more robust algorithm to build the tree structure from a flat list of files.
const buildTreeData = (files: CodeFile[]): DataNode[] => {
    const nodeMap: { [key: string]: DataNode & { children?: DataNode[] } } = {};
    const rootNodes: DataNode[] = [];

    // Sort files by path depth. This ensures parents are created before children.
    const sortedFiles = [...files].sort((a, b) => a.id.split('/').length - b.id.split('/').length);

    sortedFiles.forEach(file => {
        // Create the node for the map
        nodeMap[file.id] = {
            key: file.id,
            title: file.name,
            isLeaf: file.type === 'file',
            isLoaded: file.childrenLoaded,
            fileType: file.type,
            children: file.type === 'folder' ? [] : undefined,
        };

        const pathParts = file.id.split('/');
        if (pathParts.length > 1) {
            const parentPath = pathParts.slice(0, -1).join('/');
            const parentNode = nodeMap[parentPath];
            // If parent exists, add the current node as a child
            if (parentNode && parentNode.children) {
                // Avoid adding duplicates
                if (!parentNode.children.some(child => child.key === file.id)) {
                    parentNode.children.push(nodeMap[file.id]);
                }
            }
        } else {
            // This is a root node
            if (!rootNodes.some(node => node.key === file.id)) {
                rootNodes.push(nodeMap[file.id]);
            }
        }
    });

    // Sort all children arrays to ensure folders come first, then alphabetically
    Object.values(nodeMap).forEach(node => {
      if (node.children) {
        node.children.sort((a: any, b: any) => {
            if (a.isLeaf && !b.isLeaf) return 1; // files after folders
            if (!a.isLeaf && b.isLeaf) return -1; // folders before files
            return a.title.localeCompare(b.title); // alphabetical sort
        });
      }
    });
    
    // Sort root nodes as well
    rootNodes.sort((a: any, b: any) => {
        if (a.isLeaf && !b.isLeaf) return 1;
        if (!a.isLeaf && b.isLeaf) return -1;
        return a.title.localeCompare(b.title);
    });

    return rootNodes;
};

const SwitcherIcon = ({ expanded, isLeaf }: { expanded: boolean, isLeaf: boolean }) => {
    if (isLeaf) {
        return <span className="rc-tree-switcher-icon" style={{ width: '1rem' }} />;
    }
    return <ChevronRight className="rc-tree-switcher-icon h-4 w-4 transition-transform" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }} />;
};

const NodeIcon = ({ isLeaf, expanded, loading }: { isLeaf: boolean, expanded: boolean, loading?: boolean }) => {
    if (loading) {
        return <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />;
    }
    if (isLeaf) {
        return <FileCode className="w-4 h-4 flex-shrink-0" />;
    }
    return <Folder className="w-4 h-4 text-accent flex-shrink-0" />;
}


export function FileExplorer({ files, activeFileId, onFileSelect, onSwitchProject, onFolderExpand, project, branch }: FileExplorerProps) {
    const treeData = useMemo(() => buildTreeData(files), [files]);
    const { user, isAdmin, logout } = useAuth();
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    const [isBitbucketDialogOpen, setIsBitbucketDialogOpen] = useState(false);
    const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);

    const handleExpand = (keys: Key[], { expanded, node }: { expanded: boolean, node: DataNode }) => {
        setExpandedKeys(keys);
    };

    const handleSelect = (selectedKeys: Key[], { node }: { node: DataNode }) => {
        if (selectedKeys.length > 0 && node.isLeaf) {
            onFileSelect(selectedKeys[0] as string);
        }
    };
    
    const loadData = useCallback(async (node: DataNode): Promise<void> => {
        // The `isLoaded` property comes from our custom buildTreeData function
        const isAlreadyLoaded = (node as any).isLoaded;
        if (node.key && !node.isLeaf && !isAlreadyLoaded) {
            await onFolderExpand(node.key as string);
        }
    }, [onFolderExpand]);
    
    const memoizedSwitcherIcon = useCallback((props: any) => {
        return <SwitcherIcon expanded={props.expanded} isLeaf={props.isLeaf} />;
    }, []);

    const memoizedTitleRenderer = useCallback((node: any) => {
        return (
            <div className="flex items-center gap-2">
                <NodeIcon isLeaf={node.isLeaf} expanded={node.expanded} loading={node.loading} />
                <span className="truncate">{node.title}</span>
            </div>
        );
    }, []);

    return (
    <>
      <aside className="h-full w-full md:w-72 flex flex-col bg-sidebar-background border-r border-sidebar-border">
        <div className="p-4 border-b border-sidebar-border">
          <Logo />
        </div>
        <div className="flex-1 overflow-auto p-2 min-h-0">
          <div className="flex justify-between items-center mb-2 px-2">
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
          <div className="w-max min-w-full mt-2">
             <Tree
                treeData={treeData}
                onSelect={handleSelect}
                onExpand={handleExpand}
                selectedKeys={activeFileId ? [activeFileId] : []}
                expandedKeys={expandedKeys}
                loadData={loadData}
                prefixCls="rc-tree"
                motion={null}
                switcherIcon={memoizedSwitcherIcon}
                titleRender={memoizedTitleRenderer}
                className="w-full"
                showLine={false}
                draggable={false}
             />
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
