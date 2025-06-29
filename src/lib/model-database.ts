import sql from 'mssql';
import { getPool } from './database/db';
import type { Model, NewModel } from './model-schema';

export async function dbGetModels(): Promise<Model[]> {
  const pool = await getPool();
  const result = await pool.request().execute('sp_GetModels');
  return result.recordset;
}

export async function dbAddModel(modelData: NewModel): Promise<{ success: boolean; message?: string; model?: Model }> {
  try {
    const pool = await getPool();
    const result = await pool.request()
        .input('Name', sql.NVarChar, modelData.name)
        .input('Type', sql.NVarChar, modelData.type)
        .execute('sp_AddModel');
    
    if (result.returnValue === 0 && result.recordset.length > 0) {
      return { success: true, model: result.recordset[0] };
    } else {
      // Assuming SP returns a specific value for duplicate name
      return { success: false, message: 'A model with this name already exists.' };
    }
  } catch(error) {
    console.error(error);
    return { success: false, message: 'Database error occurred.' };
  }
}

export async function dbUpdateModel(modelData: Omit<Model, 'isDefault'>): Promise<{ success: boolean; message?: string }> {
    const pool = await getPool();
    const result = await pool.request()
        .input('ModelID', sql.Int, modelData.id)
        .input('Name', sql.NVarChar, modelData.name)
        .input('Type', sql.NVarChar, modelData.type)
        .execute('sp_UpdateModel');

    if (result.returnValue === 0) {
        return { success: true };
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

export async function dbDeleteModel(modelId: string): Promise<{ success: boolean }> {
  const pool = await getPool();
  const result = await pool.request()
      .input('ModelID', sql.Int, modelId)
      .execute('sp_DeleteModel');
  
  // Stored procedure returns 0 on success, -1 if model is default
  if (result.returnValue === 0) {
      return { success: true };
  }
  return { success: false };
}
