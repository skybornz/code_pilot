
'use server';

import { configureAi } from '@/ai/genkit';
import { withRetry } from '@/lib/utils';
import type { DebugErrorOutput } from '@/ai/flows/debug-error';
import { logUserActivity } from './activity';
import { updateUserLastActive } from './users';

export async function analyzeError(
    userId: string,
    errorMessage: string
): Promise<DebugErrorOutput | { error: string }> {
    await configureAi();

    try {
        const { debugError } = await import('@/ai/flows/debug-error');
        const analysis = await withRetry(() => debugError({ errorMessage }));

        await logUserActivity(userId, 'Debug Assist', `User requested analysis for an error.`);
        await updateUserLastActive(userId);

        return analysis;
    } catch (error: any) {
        console.error('Debug Assist action failed in server action:', error);
        return { error: error.message || 'An unexpected error occurred while processing the debug action.' };
    }
}
