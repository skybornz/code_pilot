'use server';

import { configureAi } from '@/ai/genkit';
import { withRetry } from '@/lib/utils';
import type { GenerateDiagramOutput } from '@/ai/flows/generate-diagram';
import { logUserActivity } from './activity';
import { updateUserLastActive } from './users';

export async function generateDiagramFromPrompt(
    userId: string,
    prompt: string,
    diagramType: string
): Promise<GenerateDiagramOutput | { error: string }> {
    await configureAi();

    try {
        const { generateDiagram } = await import('@/ai/flows/generate-diagram');
        const result = await withRetry(() => generateDiagram({ prompt, diagramType }));

        await logUserActivity(userId, 'Diagram Forge', `User generated a '${diagramType}' diagram.`);
        await updateUserLastActive(userId);

        return result;
    } catch (error: any) {
        console.error('Diagram Forge action failed in server action:', error);
        return { error: error.message || 'An unexpected error occurred while processing the diagram generation.' };
    }
}
