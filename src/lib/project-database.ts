import sql from 'mssql';
import { getPool } from './database/db';
import { z } from 'zod';

export const ProjectSchema = z.object({
  id: z.string(), // The DB will return INT, but we'll cast to string for consistency
  userId: z.string(),
  name: z.string(),
  url: z.string().url({ message: "Invalid Bitbucket URL" }),
});

export type Project = z.infer<typeof ProjectSchema>;
export type NewProject = Omit<Project, 'id'>;

export async function dbGetProjects(userId: string): Promise<Project[]> {
    const pool = await getPool();
    const result = await pool.request()
        .input('UserID', sql.Int, userId)
        .execute('sp_GetProjectsByUser');

    return result.recordset.map(p => ({
        id: String(p.ProjectID),
        userId: String(p.UserID),
        name: p.Name,
        url: p.URL
    }));
}

export async function dbAddProject(projectData: NewProject): Promise<{ success: boolean; message?: string; project?: Project }> {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('UserID', sql.Int, projectData.userId)
            .input('Name', sql.NVarChar, projectData.name)
            .input('URL', sql.NVarChar, projectData.url)
            .execute('sp_AddProject');

        if (result.returnValue === 0) {
            const newProject = result.recordset[0];
            return { success: true, project: {
                id: String(newProject.ProjectID), 
                userId: String(newProject.UserID),
                name: newProject.Name,
                url: newProject.URL
            }};
        } else {
            return { success: false, message: 'This project URL already exists for your account.' };
        }
    } catch(err) {
        console.error("DB Add Project Error:", err);
        return { success: false, message: 'A database error occurred.' };
    }
}

export async function dbDeleteProject(projectId: string, userId: string): Promise<{ success: boolean }> {
  const pool = await getPool();
  await pool.request()
      .input('ProjectID', sql.Int, projectId)
      .input('UserID', sql.Int, userId)
      .execute('sp_DeleteProject');
  return { success: true };
}
