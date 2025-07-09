
'use server';

import { configureAi } from '@/ai/genkit';
import { withRetry } from '@/lib/utils';
import type { ExecutePythonCodeOutput } from '@/ai/flows/execute-python-code';
import { logUserActivity } from './activity';
import { updateUserLastActive } from './users';

export async function simulatePythonExecution(
    userId: string,
    code: string,
): Promise<ExecutePythonCodeOutput | { error: string }> {
    await configureAi();

    try {
        const { executePythonCode } = await import('@/ai/flows/execute-python-code');
        const result = await withRetry(() => executePythonCode({ code }));

        await logUserActivity(userId, 'Code Fiddle', `User executed a Python snippet.`);
        await updateUserLastActive(userId);

        return result;
    } catch (error: any) {
        console.error('Code Fiddle Python execution failed in server action:', error);
        return { error: error.message || 'An unexpected error occurred while processing the Python code.' };
    }
}
