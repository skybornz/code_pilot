
'use server';

import { configureAi } from '@/ai/genkit';
import { withRetry } from '@/lib/utils';
import type { ExecuteCodeOutput } from '@/ai/flows/execute-python-code';
import { logUserActivity } from './activity';
import { updateUserLastActive } from './users';

export async function simulateCodeExecution(
    userId: string,
    code: string,
    language: string
): Promise<ExecuteCodeOutput | { error: string }> {
    await configureAi();

    try {
        const { executeCode } = await import('@/ai/flows/execute-python-code');
        const result = await withRetry(() => executeCode({ code, language }));

        await logUserActivity(userId, 'Code Fiddle', `User executed a ${language} snippet.`);
        await updateUserLastActive(userId);

        return result;
    } catch (error: any) {
        console.error('Code Fiddle execution failed in server action:', error);
        return { error: error.message || 'An unexpected error occurred while processing the code.' };
    }
}
