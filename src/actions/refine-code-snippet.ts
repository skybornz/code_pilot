
'use server';

import { configureAi } from '@/ai/genkit';
import { withRetry } from '@/lib/utils';
import type { RefineCodeSnippetOutput } from '@/ai/flows/refine-code-snippet';
import { logUserActivity } from './activity';
import { updateUserLastActive } from './users';

export async function refineCodeSnippet(
    userId: string,
    code: string,
    instruction: string,
    language: string
): Promise<RefineCodeSnippetOutput | { error: string }> {
    await configureAi();

    try {
        const { refineCodeSnippet } = await import('@/ai/flows/refine-code-snippet');
        const result = await withRetry(() => refineCodeSnippet({ code, instruction, language }));

        await logUserActivity(userId, 'Code GPT', `User refined a '${language}' snippet with instruction: "${instruction}"`);
        await updateUserLastActive(userId);

        return result;
    } catch (error: any) {
        console.error('Code GPT refinement action failed in server action:', error);
        return { error: error.message || 'An unexpected error occurred while processing the code refinement.' };
    }
}
