
'use client';

import { cn } from '@/lib/utils';
import type { CodeFile } from './types';
import { Button } from '../ui/button';
import { X, FileCode } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import React, { useRef } from 'react';

interface EditorTabsProps {
  openFiles: CodeFile[];
  activeFileId: string | null;
  onTabSelect: (fileId: string) => void;
  onTabClose: (fileId: string) => void;
}

export function EditorTabs({
  openFiles,
  activeFileId,
  onTabSelect,
  onTabClose,
}: EditorTabsProps) {
  const activeTabRef = useRef<HTMLDivElement>(null);

  if (openFiles.length === 0) {
    return null;
  }
  
  // This is a side-effect to scroll the active tab into view
  React.useEffect(() => {
    if (activeTabRef.current) {
        activeTabRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeFileId]);

  return (
    <div className="flex-shrink-0 border-b bg-muted/20">
      <ScrollArea orientation="horizontal" className="h-full">
        <div className="flex items-center" style={{ display: 'inline-flex', minWidth: '100%' }}>
          {openFiles.map(file => (
            <div
              key={file.id}
              ref={activeFileId === file.id ? activeTabRef : null}
              onClick={() => onTabSelect(file.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-xs border-r cursor-pointer whitespace-nowrap',
                activeFileId === file.id
                  ? 'bg-background text-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <FileCode className="h-4 w-4 flex-shrink-0" />
              <span className="truncate" title={file.name}>{file.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 rounded-full ml-2 hover:bg-destructive/20"
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(file.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
