import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './code-block';

/**
 * A component that intelligently renders chat message content using react-markdown.
 * It handles various markdown elements and renders code blocks with syntax highlighting.
 */
export const MessageContent = ({ content }: { content: string }) => {
  return (
    <div className="space-y-4">
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeText = String(children).trimEnd();
                    
                    // A more robust check: if it's multi-line or has a language tag, treat as a block.
                    const isBlock = codeText.includes('\n') || !!match;

                    if (isBlock) {
                        return (
                            <CodeBlock
                                language={match ? match[1] : 'text'}
                                code={codeText}
                            />
                        );
                    }
                    
                    // Otherwise, treat it as inline code.
                    return (
                        <code className="bg-muted px-1.5 py-1 rounded-md font-mono text-sm" {...props}>
                            {children}
                        </code>
                    );
                },
                 p: ({ node, ...props }) => <div className="whitespace-pre-wrap leading-relaxed" {...props} />,
            }}
        >
            {content}
        </ReactMarkdown>
    </div>
  );
};
