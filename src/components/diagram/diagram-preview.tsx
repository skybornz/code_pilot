
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
        const uniqueId = `mermaid-graph-${Date.now()}`;
        const { svg } = await mermaid.render(uniqueId, code);

        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
        setError(null);
      } catch (e: any) {
        console.error('Mermaid render error:', e);
        
        let errorMessage = 'Invalid diagram syntax. Please check the generated code for errors.';
        if (typeof e.str === 'string' && e.str.includes('classDiagram')) {
            errorMessage = 'Invalid Class Diagram syntax. Please check for correct class definitions (e.g., `class Name { }`) and relationships (e.g., `ClassA --|> ClassB`).';
        }

        setError(errorMessage);

        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    renderDiagram();
  }, [code]);
  
  useEffect(() => {
     mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'loose',
      themeVariables: {
        background: '#ffffff',
        primaryColor: '#f1f5f9',
        primaryTextColor: '#020617',
        primaryBorderColor: '#06b6d4',
        lineColor: '#020617',
        secondaryColor: '#e2e8f0',
        tertiaryColor: '#f8fafc',
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
