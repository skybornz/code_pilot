'use server';

import { dbGetProjects, dbAddProject, dbDeleteProject, type Project, type NewProject } from '@/lib/project-database';

export async function getProjects(userId: string): Promise<Project[]> {
    return dbGetProjects(userId);
}

export async function addProject(projectData: NewProject): Promise<{ success: boolean; message?: string; project?: Project }> {
    return dbAddProject(projectData);
}

export async function deleteProject(projectId: string, userId: string): Promise<{ success: boolean }> {
    return dbDeleteProject(projectId, userId);
}
