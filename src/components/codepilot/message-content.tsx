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
                code: ({ node, inline, className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || '');
                    if (!inline) {
                        return (
                            <CodeBlock
                                language={match ? match[1] : 'text'}
                                code={String(children).trimEnd()}
                            />
                        );
                    }
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
