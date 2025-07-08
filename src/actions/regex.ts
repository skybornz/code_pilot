'use server';

import { configureAi } from '@/ai/genkit';
import { withRetry } from '@/lib/utils';
import type { GenerateRegexOutput } from '@/ai/flows/generate-regex';
import { logUserActivity } from './activity';
import { updateUserLastActive } from './users';

export async function getRegexFromPrompt(
    userId: string,
    prompt: string
): Promise<GenerateRegexOutput | { error: string }> {
    await configureAi();

    try {
        const { generateRegex } = await import('@/ai/flows/generate-regex');
        const result = await withRetry(() => generateRegex({ prompt }));

        await logUserActivity(userId, 'Regex Wizard', `User generated a regex for prompt: "${prompt}"`);
        await updateUserLastActive(userId);

        return result;
    } catch (error: any) {
        console.error('Regex Wizard action failed in server action:', error);
        return { error: error.message || 'An unexpected error occurred while processing the regex generation.' };
    }
}
