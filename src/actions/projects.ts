'use server';

import { dbGetProjects, dbAddProject, dbDeleteProject, type Project, type NewProject } from '@/lib/project-database';
import { dbUpdateUserLastActive } from '@/lib/user-database';

export async function getProjects(userId: string): Promise<Project[]> {
    return dbGetProjects(userId);
}

export async function addProject(projectData: NewProject): Promise<{ success: boolean; message?: string; project?: Project }> {
    const result = await dbAddProject(projectData);
    if (result.success) {
        await dbUpdateUserLastActive(projectData.userId);
    }
    return result;
}

export async function deleteProject(projectId: string, userId: string): Promise<{ success: boolean }> {
    return dbDeleteProject(projectId, userId);
}
