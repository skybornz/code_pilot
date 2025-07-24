
'use client';

import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { python } from '@codemirror/lang-python';
import { markdown } from '@codemirror/lang-markdown';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EditorView } from '@codemirror/view';

interface CodeBlockProps {
  code: string;
  language?: string;
  onCopy?: () => void;
}

const getLanguageExtension = (language?: string) => {
  switch (language?.toLowerCase()) {
    case 'javascript':
    case 'typescript':
    case 'tsx':
    case 'jsx':
    case 'json':
      return [javascript({ jsx: true, typescript: true })];
    case 'css':
      return [css()];
    case 'python':
      return [python()];
    case 'markdown':
      return [markdown()];
    default:
      // Fallback for other languages like text, shell script, etc.
      return [javascript({ jsx: true, typescript: true })];
  }
};

export function CodeBlock({ code, language, onCopy }: CodeBlockProps) {
  const langExtension = useMemo(() => getLanguageExtension(language), [language]);
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    if (!navigator.clipboard) {
      toast({
        variant: 'destructive',
        title: 'Copy Failed',
        description: 'Clipboard API is not available in this browser or context (e.g., non-HTTPS).',
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      toast({
        title: 'Copied to clipboard',
      });
      if (onCopy) {
        onCopy();
      }
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast({
        variant: 'destructive',
        title: 'Copy Failed',
        description: 'Could not copy code to clipboard.',
      });
    }
  };

  return (
    <div className="relative group rounded-md overflow-hidden bg-muted/20 h-full">
        <Button 
            size="icon" 
            variant="ghost"
            onClick={handleCopy}
            className="absolute top-2 right-2 z-10 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Copy code"
        >
            {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
        <CodeMirror
            value={code}
            height="100%"
            theme={vscodeDark}
            extensions={[...langExtension, EditorView.lineWrapping]}
            readOnly={true}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              autocompletion: false,
              editable: false,
              highlightActiveLine: false,
              highlightActiveLineGutter: false,
            }}
            className="h-full"
            style={{
                fontSize: '0.875rem', // equiv to text-sm
                fontFamily: 'var(--font-code)',
            }}
        />
    </div>
  );
}
