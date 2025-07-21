
'use server';

import { configureAi } from '@/ai/genkit';
import { getDefaultModel } from './models';
import { withRetry } from '@/lib/utils';
import type { ActionType, AIOutput } from '@/components/codepilot/types';
import type { Message } from '@/ai/flows/copilot-chat';
import { logUserActivity } from './activity';
import { updateUserLastActive } from './users';

async function getModelName(): Promise<string> {
    const modelConfig = await getDefaultModel();
    if (!modelConfig) {
        throw new Error('No default model is configured.');
    }
    return modelConfig.type === 'local'
        ? `ollama/${modelConfig.name}`
        : `googleai/${modelConfig.name}`;
}

export async function performAiAction(
    userId: string,
    action: ActionType,
    code: string,
    language: string,
    originalCode?: string,
    framework?: string,
    dependencies?: { name: string; content: string }[],
    activeFileName?: string,
): Promise<AIOutput | { error: string }> {
    await configureAi();

    try {
        const model = await getModelName();
        let result: Omit<AIOutput, 'fileContext'> | null = null;
        let actionName: string = 'Unknown AI Action';

        if (action === 'analyze-diff' && originalCode !== undefined) {
            actionName = 'Analyze Diff';
            const { analyzeDiff } = await import('@/ai/flows/analyze-diff');
            const analysis = await withRetry(() => analyzeDiff({ model, oldCode: originalCode, newCode: code, language }));
            result = { type: 'analyze-diff', data: analysis.analysis, title: 'Change Analysis' };
        } else if (action === 'explain') {
            actionName = 'Explain Code';
            const { explainCode } = await import('@/ai/flows/explain-code');
            const explanationData = await withRetry(() => explainCode({ model, code }));
            result = { type: 'explain', data: explanationData.explanation, title: 'Code Explanation' };
        } else if (action === 'bugs') {
            actionName = 'Find Bugs';
            const { findBugs } = await import('@/ai/flows/find-bugs');
            const bugReport = await withRetry(() => findBugs({ model, code }));
            result = { type: 'bugs', data: bugReport.report, title: 'Bug Report' };
        } else if (action === 'test') {
            actionName = 'Generate Test';
            const { generateUnitTest } = await import('@/ai/flows/generate-unit-test');
            const unitTest = await withRetry(() => generateUnitTest({ model, code, language, framework, dependencies }));
            result = { type: 'test', data: unitTest.test, title: 'Generated Unit Test', language };
        } else if (action === 'refactor') {
            actionName = 'Refactor Code';
            const { refactorCode } = await import('@/ai/flows/refactor-code');
            const refactored = await withRetry(() => refactorCode({ model, code, language }));
            result = { type: 'refactor', data: refactored.refactor, title: 'Refactor Suggestion', language };
        } else if (action === 'sdd') {
            actionName = 'Generate SDD';
            const { generateSdd } = await import('@/ai/flows/generate-sdd');
            const sdd = await withRetry(() => generateSdd({ model, code }));
            result = { type: 'sdd', data: sdd.sdd, title: 'Software Design Document', language: 'markdown' };
        }

        if (result) {
            await logUserActivity(userId, actionName, `Used ${actionName} on file: ${activeFileName || 'unknown'}`);
            await updateUserLastActive(userId);
            return result as AIOutput;
        }

        return { error: 'Unknown AI action type.' };
    } catch (error: any) {
        console.error('AI action failed in server action:', error);
        return { error: error.message || 'An unexpected error occurred while processing the AI action.' };
    }
}


export async function streamCopilotChat(
    userId: string,
    messages: Message[],
    projectContext?: string,
    discussionContext?: string,
): Promise<ReadableStream<Uint8Array>> {
    await configureAi();

    const { copilotChat } = await import('@/ai/flows/copilot-chat');
    const model = await getModelName();

    const stream = await copilotChat({
        model,
        messages,
        projectContext,
        discussionContext,
    });
    
    // Log activity once at the beginning of a successful stream
    if (messages.length > 0 && messages[messages.length-1].role === 'user') {
        await logUserActivity(userId, 'AD Labs Chat', `User initiated a chat stream.`);
        await updateUserLastActive(userId);
    }

    return stream;
}
