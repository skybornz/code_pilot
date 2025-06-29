'use server';

import { dbGetModels, dbAddModel, dbDeleteModel, dbUpdateModel, type Model, type NewModel } from '@/lib/model-database';

export async function getModels(): Promise<Model[]> {
  return dbGetModels();
}

export async function addModel(modelData: NewModel): Promise<{ success: boolean; message?: string; model?: Model }> {
  return dbAddModel(modelData);
}

export async function updateModel(modelData: Model): Promise<{ success: boolean; message?: string }> {
    return dbUpdateModel(modelData);
}

export async function deleteModel(modelId: string): Promise<{ success: boolean }> {
  return dbDeleteModel(modelId);
}
