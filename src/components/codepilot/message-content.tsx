import { CodeBlock } from './code-block';

/**
 * A component that intelligently renders chat message content.
 * It detects markdown code blocks and renders them with proper styling,
 * while displaying regular text normally.
 */
export const MessageContent = ({ content }: { content: string }) => {
    // Regex to split content by markdown-style code blocks, keeping the delimiters.
    const parts = content.split(/(```[\w-]*\n[\s\S]*?\n```)/g);

    // If no code blocks are found, render as a single block of text.
    if (parts.length <= 1) {
        return <p className="whitespace-pre-wrap">{content}</p>;
    }

    return (
        <div className="space-y-4">
            {parts.map((part, index) => {
                // Don't render empty strings that can result from the split.
                if (!part.trim()) return null;

                const codeBlockMatch = part.match(/```([\w-]*)\n([\s\S]*?)\n```/);

                if (codeBlockMatch) {
                    const language = codeBlockMatch[1] || 'text';
                    const code = codeBlockMatch[2].trim();
                    // Use the dedicated CodeBlock component for syntax highlighting and styling.
                    return <CodeBlock key={index} code={code} language={language} />;
                } else {
                    // Render plain text parts, preserving whitespace.
                    return <p key={index} className="whitespace-pre-wrap">{part}</p>;
                }
            })}
        </div>
    );
};
