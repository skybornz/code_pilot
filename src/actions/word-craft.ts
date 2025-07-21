
'use server';

import { configureAi } from '@/ai/genkit';
import { withRetry } from '@/lib/utils';
import type { RefineTextOutput } from '@/ai/flows/refine-text';
import { logUserActivity } from './activity';
import { updateUserLastActive } from './users';

export async function refineTextAction(
    userId: string,
    text: string,
    action: string,
    template?: string,
    enhance?: boolean
): Promise<RefineTextOutput | { error: string }> {
    await configureAi();

    try {
        const { refineText } = await import('@/ai/flows/refine-text');
        // The result is now a direct string, not an object.
        const resultText = await withRetry(() => refineText({ text, action, template, enhance }));

        await logUserActivity(userId, 'Word Craft', `User performed action: "${action}"`);
        await updateUserLastActive(userId);

        // Wrap the text in the expected output format for the component.
        return { refinedText: resultText };
    } catch (error: any) {
        console.error('Word Craft action failed in server action:', error);
        return { error: error.message || 'An unexpected error occurred while processing the text refinement.' };
    }
}
