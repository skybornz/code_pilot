
'use client';

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface DiagramPreviewProps {
  code: string;
}

export function DiagramPreview({ code }: DiagramPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!code.trim() || !containerRef.current) {
          if (containerRef.current) {
              containerRef.current.innerHTML = '<div class="flex items-center justify-center h-full text-muted-foreground"><p>Your diagram will appear here.</p></div>';
          }
          setIsLoading(false);
          setError(null);
          return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // We need a unique ID for mermaid to render into, to avoid conflicts.
        const uniqueId = `mermaid-graph-${Date.now()}`;
        
        // mermaid.render returns the SVG code as a string.
        const { svg } = await mermaid.render(uniqueId, code);

        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
        setError(null);
      } catch (e: any) {
        console.error('Mermaid render error:', e);
        setError('Invalid diagram syntax. Please check the generated code for errors.');
        if (containerRef.current) {
          // Clear the container on error to avoid showing a broken diagram
          containerRef.current.innerHTML = '';
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    renderDiagram();
  }, [code]);
  
  // Initialize mermaid on component mount
  useEffect(() => {
     mermaid.initialize({
      startOnLoad: false,
      theme: 'base', // Use the 'base' (light) theme for rendering
      securityLevel: 'loose',
      themeVariables: {
        background: '#ffffff', // white
        primaryColor: '#f1f5f9', // slate-100
        primaryTextColor: '#020617', // slate-950
        primaryBorderColor: '#06b6d4', // cyan-500
        lineColor: '#020617', // slate-950
        secondaryColor: '#e2e8f0', // slate-200
        tertiaryColor: '#f8fafc', // slate-50
      },
    });
  }, []);

  return (
    <div className="h-full w-full relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}
      {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 p-4">
              <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Diagram Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
              </Alert>
          </div>
      )}
      <div 
        ref={containerRef}
        className="mermaid h-full w-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full"
      >
        {/* Content is set via innerHTML by the useEffect hook */}
      </div>
    </div>
  );
}
