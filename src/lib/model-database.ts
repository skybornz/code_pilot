'use client';

import { z } from 'zod';

const OnlineModelSchema = z.object({
  id: z.string(),
  type: z.literal('online'),
  name: z.string().min(1, 'Name is required'),
  apiKey: z.string().min(1, 'API Key is required'),
});

const LocalModelSchema = z.object({
  id: z.string(),
  type: z.literal('local'),
  name: z.string().min(1, 'Connection name is required'),
  apiUrl: z.string().url('Invalid API URL'),
  modelName: z.string().min(1, 'Model name is required'),
});

export const ModelSchema = z.discriminatedUnion('type', [
  OnlineModelSchema,
  LocalModelSchema,
]);

export type Model = z.infer<typeof ModelSchema>;
export type NewModel = Omit<Model, 'id'>;

const MODELS_KEY = 'semco_pilot_models';

function getModelsFromStorage(): Model[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const modelsJson = localStorage.getItem(MODELS_KEY);
    const parsed = modelsJson ? JSON.parse(modelsJson) : [];
    // Pre-populate with a default local model if storage is empty
    if (parsed.length === 0) {
        const defaultModels: Model[] = [
            { id: 'ollama-default', type: 'local', name: 'Default Llama3', apiUrl: 'http://localhost:11434', modelName: 'llama3' }
        ];
        saveModelsToStorage(defaultModels);
        return defaultModels;
    }
    return ModelSchema.array().parse(parsed);
  } catch (error) {
    console.error("Failed to parse models from localStorage, resetting.", error);
    if (typeof window !== 'undefined') {
        localStorage.removeItem(MODELS_KEY);
    }
    return [];
  }
}

function saveModelsToStorage(models: Model[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(MODELS_KEY, JSON.stringify(models));
  }
}

export function dbGetModels(): Model[] {
  return getModelsFromStorage();
}

export function dbAddModel(modelData: NewModel): { success: boolean; message?: string; model?: Model } {
  const models = getModelsFromStorage();
  const newModel: Model = { ...modelData, id: String(Date.now()) };
  const updatedModels = [...models, newModel];
  saveModelsToStorage(updatedModels);
  return { success: true, model: newModel };
}

export function dbUpdateModel(modelData: Model): { success: boolean; message?: string } {
    const models = getModelsFromStorage();
    const modelIndex = models.findIndex(m => m.id === modelData.id);

    if (modelIndex === -1) {
        return { success: false, message: 'Model not found.' };
    }

    models[modelIndex] = modelData;
    saveModelsToStorage(models);
    return { success: true };
}

export function dbDeleteModel(modelId: string): { success: boolean } {
  let models = getModelsFromStorage();
  models = models.filter(m => m.id !== modelId);
  saveModelsToStorage(models);
  return { success: true };
}
