
'use server';

import { configureAi } from '@/ai/genkit';
import { withRetry } from '@/lib/utils';
import type { GenerateCodeSnippetOutput } from '@/ai/flows/generate-code-snippet';
import { logUserActivity } from './activity';
import { updateUserLastActive } from './users';

export async function generateSnippetFromPrompt(
    userId: string,
    prompt: string,
    language: string
): Promise<GenerateCodeSnippetOutput | { error: string }> {
    await configureAi();

    try {
        const { generateCodeSnippet } = await import('@/ai/flows/generate-code-snippet');
        const result = await withRetry(() => generateCodeSnippet({ prompt, language }));

        await logUserActivity(userId, 'Code GPT', `User generated a '${language}' snippet.`);
        await updateUserLastActive(userId);

        return result;
    } catch (error: any) {
        console.error('Code GPT action failed in server action:', error);
        return { error: error.message || 'An unexpected error occurred while processing the code generation.' };
    }
}
