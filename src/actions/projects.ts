'use server';

import { dbGetProjects, dbAddProject, dbDeleteProject, type Project, type NewProject } from '@/lib/project-database';
import { dbUpdateUserLastActive } from '@/lib/user-database';
import { fetchBitbucketBranches } from './github';

export async function getProjects(userId: string): Promise<Project[]> {
    return dbGetProjects(userId);
}

export async function addProject(projectData: NewProject): Promise<{ success: boolean; message?: string; project?: Project }> {
    const host = process.env.BITBUCKET_SERVER_HOST;
    const projectKey = process.env.BITBUCKET_SERVER_PROJECT;

    if (!host || !projectKey) {
        return { success: false, message: 'Bitbucket Server host and project key are not configured in the environment. Please ask the administrator to set BITBUCKET_SERVER_HOST and BITBUCKET_SERVER_PROJECT.' };
    }
    
    const repoName = projectData.name;
    const fullUrl = `${host}/projects/${projectKey}/repos/${repoName}`;

    // Validate the constructed URL by trying to fetch branches
    const validationResult = await fetchBitbucketBranches(fullUrl, projectData.userId);

    if (!validationResult.success) {
        return { success: false, message: validationResult.error || `Could not validate the repository '${repoName}'. Please check the name and your permissions.` };
    }
    
    const dataToSave: NewProject = {
        name: repoName,
        url: fullUrl,
        userId: projectData.userId,
    };

    const result = await dbAddProject(dataToSave);
    if (result.success) {
        await dbUpdateUserLastActive(projectData.userId);
    }
    return result;
}

export async function deleteProject(projectId: string, userId: string): Promise<{ success: boolean }> {
    return dbDeleteProject(projectId, userId);
}
