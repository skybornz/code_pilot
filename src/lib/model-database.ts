'use client';

import { Model, ModelSchema, NewModel } from './model-schema';

const MODELS_KEY = 'semco_pilot_models';

function getModelsFromStorage(): Model[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const modelsJson = localStorage.getItem(MODELS_KEY);
    const parsed = modelsJson ? JSON.parse(modelsJson) : [];
    
    // Pre-populate with a single default if storage is empty
    if (parsed.length === 0) {
        const geminiModel: Model = {
            id: 'gemini-default-online',
            type: 'online',
            name: 'Gemini (Cloud)',
            isDefault: true,
        };
        const defaultModels: Model[] = [geminiModel];
        saveModelsToStorage(defaultModels);
        return defaultModels;
    }
    return ModelSchema.array().parse(parsed);
  } catch (error) {
    console.error("Failed to parse models from localStorage, resetting.", error);
    if (typeof window !== 'undefined') {
        localStorage.removeItem(MODELS_KEY);
    }
    // Repopulate after error
    const defaultModels: Model[] = [
        {
            id: 'gemini-default-online',
            type: 'online',
            name: 'Gemini (Cloud)',
            isDefault: true,
        }
    ];
    saveModelsToStorage(defaultModels);
    return defaultModels;
  }
}

function saveModelsToStorage(models: Model[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(MODELS_KEY, JSON.stringify(models));
  }
}

export function dbGetModels(): Model[] {
  let models = getModelsFromStorage();
  
  const hasDefault = models.some(m => m.isDefault);
  if (!hasDefault && models.length > 0) {
      models[0].isDefault = true;
      saveModelsToStorage(models);
  }
  return models;
}

export function dbAddModel(modelData: NewModel): { success: boolean; message?: string; model?: Model } {
  const models = getModelsFromStorage();
  const newModel: Model = { ...modelData, id: String(Date.now()), isDefault: models.length === 0 };
  const updatedModels = [...models, newModel];
  saveModelsToStorage(updatedModels);
  return { success: true, model: newModel };
}

export function dbUpdateModel(modelData: Omit<Model, 'isDefault'>): { success: boolean; message?: string } {
    const models = getModelsFromStorage();
    const modelIndex = models.findIndex(m => m.id === modelData.id);

    if (modelIndex === -1) {
        return { success: false, message: 'Model not found.' };
    }

    // Preserve the isDefault status from the original model, as this is handled separately
    models[modelIndex] = { ...modelData, isDefault: models[modelIndex].isDefault };
    saveModelsToStorage(models);
    return { success: true };
}

export function dbSetDefaultModel(modelId: string): { success: boolean } {
  let models = getModelsFromStorage();
  models = models.map(m => ({
    ...m,
    isDefault: m.id === modelId,
  }));
  saveModelsToStorage(models);
  return { success: true };
}

export function dbDeleteModel(modelId: string): { success: boolean } {
  let models = getModelsFromStorage();
  models = models.filter(m => m.id !== modelId);
  
  const hasDefault = models.some(m => m.isDefault);
  if (!hasDefault && models.length > 0) {
      models[0].isDefault = true;
  }
  
  saveModelsToStorage(models);
  return { success: true };
}
