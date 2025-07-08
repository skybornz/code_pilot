'use client';

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface DiagramPreviewProps {
  code: string;
  diagramKey: number; // Used to force re-render
}

export function DiagramPreview({ code, diagramKey }: DiagramPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!code) {
        setIsLoading(false);
        setError(null);
        if(containerRef.current) {
            containerRef.current.innerHTML = '<div class="flex items-center justify-center h-full text-muted-foreground"><p>Your diagram will appear here.</p></div>';
        }
        return;
    }
    
    setIsLoading(true);
    setError(null);

    // Give React time to render the div with the new key before running Mermaid
    setTimeout(() => {
      try {
        if (containerRef.current) {
            // Clear previous content
            containerRef.current.innerHTML = code;
            mermaid.run({
                nodes: [containerRef.current],
            });
            setError(null);
        }
      } catch (e: any) {
        console.error('Mermaid render error:', e);
        setError(e.message || 'Invalid diagram syntax.');
      } finally {
        setIsLoading(false);
      }
    }, 100);

  }, [code, diagramKey]);
  
  // Initialize mermaid on component mount
  useEffect(() => {
     mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      themeVariables: {
        // Using hardcoded hex values that match the dark theme
        background: '#1f1f29', // card
        primaryColor: '#333340', // muted
        primaryTextColor: '#f9fafb', // foreground
        primaryBorderColor: '#aa00ff', // accent
        lineColor: '#aa00ff', // accent
        secondaryColor: '#333340', // secondary
        tertiaryColor: '#14141f', // background
      },
    });
  }, []);

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-4 flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/50 z-10">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}
        {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10 p-4">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Diagram Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        )}
        {/* The key is crucial to force a re-render from scratch */}
        <div 
          key={diagramKey} 
          ref={containerRef}
          className="mermaid h-full w-full flex items-center justify-center"
        >
          {/* Content is set via innerHTML */}
        </div>
      </CardContent>
    </Card>
  );
}
