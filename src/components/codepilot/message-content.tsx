import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './code-block';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

/**
 * A component that intelligently renders chat message content using react-markdown.
 * It handles various markdown elements and renders code blocks with syntax highlighting and proper styling.
 */
export const MessageContent = ({ content, onCopy }: { content: string, onCopy?: () => void }) => {
  return (
    <div className="prose prose-invert prose-sm max-w-none 
                   prose-headings:font-semibold prose-headings:text-foreground
                   prose-p:leading-relaxed prose-p:whitespace-pre-wrap
                   prose-a:text-primary hover:prose-a:text-primary/80
                   prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground
                   prose-strong:text-foreground
                   prose-code:bg-muted prose-code:px-1.5 prose-code:py-1 prose-code:rounded-md prose-code:font-mono prose-code:text-sm
                   prose-ul:list-disc prose-ol:list-decimal prose-li:my-1
                   prose-table:w-full prose-table:my-4
                   prose-thead:border-b prose-tr:border-b
                   prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:font-medium prose-th:text-muted-foreground
                   prose-td:p-4 prose-td:align-middle
                   ">
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                // Override default code block rendering to use our custom CodeBlock component
                code(props) {
                    const { children, className, node, ...rest } = props
                    const match = /language-(\w+)/.exec(className || '')
                    const codeText = String(children).trimEnd();
                    
                    const isBlock = codeText.includes('\n') || !!match;

                    return isBlock ? (
                        <CodeBlock
                            language={match ? match[1] : 'text'}
                            code={codeText}
                            onCopy={onCopy}
                        />
                    ) : (
                        <code {...rest} className={className}>
                            {children}
                        </code>
                    )
                },
                // Use ShadCN table components for styling
                table: ({ children }) => <Table>{children}</Table>,
                thead: ({ children }) => <TableHeader>{children}</TableHeader>,
                tbody: ({ children }) => <TableBody>{children}</TableBody>,
                tr: ({ children }) => <TableRow>{children}</TableRow>,
                th: ({ children }) => <TableHead>{children}</TableHead>,
                td: ({ children }) => <TableCell>{children}</TableCell>,
            }}
        >
            {content}
        </ReactMarkdown>
    </div>
  );
};
