import { Markdown } from '@llm-ui/markdown';
import { CodeBlock } from './code-block';

/**
 * A component that intelligently renders chat message content using @llm-ui/markdown.
 * It handles various markdown elements and renders code blocks with syntax highlighting.
 */
export const MessageContent = ({ content }: { content: string }) => {
  return (
    <div className="space-y-4">
        <Markdown
            components={{
                code: ({ node, inline, className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    if (!inline && match) {
                        return (
                            <CodeBlock
                                language={match[1]}
                                code={String(children).trimEnd()}
                            />
                        );
                    }
                    if (!inline) {
                         return (
                            <CodeBlock
                                language="text"
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
                 p: ({ node, ...props }) => <p className="whitespace-pre-wrap leading-relaxed" {...props} />,
            }}
        >
            {content}
        </Markdown>
    </div>
  );
};
