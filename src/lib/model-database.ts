import sql from 'mssql';
import { getPool } from './database/db';
import type { Model, NewModel } from './model-schema';

export async function dbGetModels(): Promise<Model[]> {
  const pool = await getPool();
  const result = await pool.request().execute('sp_GetModels');
  return result.recordset.map(record => ({
    id: String(record.ModelID),
    name: record.Name,
    type: record.Type,
    isDefault: record.IsDefault,
  }));
}

export async function dbGetDefaultModel(): Promise<Model | null> {
    const pool = await getPool();
    const result = await pool.request().execute('sp_GetDefaultModel');
    if (result.recordset.length > 0) {
        const record = result.recordset[0];
        return {
            id: String(record.ModelID),
            name: record.Name,
            type: record.Type,
            isDefault: record.IsDefault,
        };
    }
    return null;
}

export async function dbAddModel(modelData: NewModel): Promise<{ success: boolean; message?: string; model?: Model }> {
  try {
    const pool = await getPool();
    const result = await pool.request()
        .input('Name', sql.NVarChar, modelData.name)
        .input('Type', sql.NVarChar, modelData.type)
        .execute('sp_AddModel');
    
    if (result.returnValue === 0 && result.recordset.length > 0) {
      const record = result.recordset[0];
      const newModel: Model = {
          id: String(record.ModelID),
          name: record.Name,
          type: record.Type,
          isDefault: record.IsDefault
      };
      return { success: true, model: newModel };
    } else {
      return { success: false, message: 'A model with this name already exists.' };
    }
  } catch(error) {
    console.error(error);
    return { success: false, message: 'Database error occurred.' };
  }
}

export async function dbUpdateModel(modelData: Model): Promise<{ success: boolean; message?: string }> {
    const pool = await getPool();
    const result = await pool.request()
        .input('ModelID', sql.Int, modelData.id)
        .input('Name', sql.NVarChar, modelData.name)
        .input('Type', sql.NVarChar, modelData.type)
        .execute('sp_UpdateModel');

    if (result.returnValue === 0) {
        return { success: true };
    }
    if (result.returnValue === 1) {
        return { success: false, message: 'A model with this name already exists.' };
    }
    return { success: false, message: 'Model not found or update failed.' };
}

export async function dbSetDefaultModel(modelId: string): Promise<{ success: boolean }> {
  const pool = await getPool();
  await pool.request()
      .input('ModelID', sql.Int, modelId)
      .execute('sp_SetDefaultModel');
  return { success: true };
}

export async function dbDeleteModel(modelId: string): Promise<{ success: boolean, message?: string }> {
  const pool = await getPool();
  const result = await pool.request()
      .input('ModelID', sql.Int, modelId)
      .execute('sp_DeleteModel');
  
  if (result.returnValue === 0) {
      return { success: true };
  }
  if (result.returnValue === 1) {
    return { success: false, message: "Cannot delete the default model." };
  }
  return { success: false, message: "Failed to delete model. It might not exist." };
}
