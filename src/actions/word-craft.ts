'use server';

import { configureAi } from '@/ai/genkit';
import { withRetry } from '@/lib/utils';
import type { RefineTextOutput } from '@/ai/flows/refine-text';
import { logUserActivity } from './activity';
import { updateUserLastActive } from './users';

export async function refineTextAction(
    userId: string,
    text: string,
    contentType: string
): Promise<RefineTextOutput | { error: string }> {
    await configureAi();

    try {
        const { refineText } = await import('@/ai/flows/refine-text');
        const result = await withRetry(() => refineText({ text, contentType }));

        await logUserActivity(userId, 'Word Craft', `User refined text for type: "${contentType}"`);
        await updateUserLastActive(userId);

        return result;
    } catch (error: any) {
        console.error('Word Craft action failed in server action:', error);
        return { error: error.message || 'An unexpected error occurred while processing the text refinement.' };
    }
}
