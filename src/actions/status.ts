'use server';

import { getDefaultModel } from './models';
import { configureAi } from '@/ai/genkit';
import type { CheckModelStatusOutput } from '@/ai/flows/check-model-status';

export async function checkDefaultModelStatus(): Promise<CheckModelStatusOutput> {
  // Ensure Genkit is configured for this serverless environment
  await configureAi();
  // Dynamically import the flow after AI is configured.
  const { checkModelStatus } = await import('@/ai/flows/check-model-status');

  const defaultModel = await getDefaultModel();

  if (!defaultModel) {
    return { success: false, message: 'No default model is configured.' };
  }

  const modelName = defaultModel.type === 'online'
    ? `googleai/${defaultModel.name}`
    : `ollama/${defaultModel.name}`;

  try {
    const result = await checkModelStatus({ model: modelName });
    return result;
  } catch (error: any) {
    console.error(`Error invoking checkModelStatus flow for ${modelName}:`, error);
    return { success: false, message: error.message || 'Failed to invoke status check flow.' };
  }
}
