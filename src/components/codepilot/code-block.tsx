'use client';

import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { python } from '@codemirror/lang-python';
import { markdown } from '@codemirror/lang-markdown';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { useMemo } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
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

export function CodeBlock({ code, language }: CodeBlockProps) {
  const langExtension = useMemo(() => getLanguageExtension(language), [language]);

  return (
    <div className="relative rounded-md overflow-hidden">
        <CodeMirror
            value={code}
            height="auto"
            theme={vscodeDark}
            extensions={langExtension}
            readOnly={true}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              autocompletion: false,
              editable: false,
              highlightActiveLine: false,
              highlightActiveLineGutter: false,
            }}
            style={{
                fontSize: '0.875rem', // equiv to text-sm
                fontFamily: 'var(--font-code)',
            }}
        />
    </div>
  );
}
