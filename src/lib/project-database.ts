'use client';

import { z } from 'zod';

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url({ message: "Invalid Bitbucket URL" }),
});

export type Project = z.infer<typeof ProjectSchema>;

const PROJECTS_KEY = 'semco_pilot_projects';

// In a real app, this would be a database.
function getProjectsFromStorage(): Project[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const projectsJson = localStorage.getItem(PROJECTS_KEY);
    const parsed = projectsJson ? JSON.parse(projectsJson) : [];
    // Validate data from localStorage
    return ProjectSchema.array().parse(parsed);
  } catch (error) {
    console.error("Failed to parse projects from localStorage, resetting.", error);
    // If parsing fails, clear the invalid data
    if (typeof window !== 'undefined') {
        localStorage.removeItem(PROJECTS_KEY);
    }
    return [];
  }
}

function saveProjectsToStorage(projects: Project[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  }
}

export function dbGetProjects(): Project[] {
  return getProjectsFromStorage();
}

export function dbAddProject(projectData: Omit<Project, 'id'>): { success: boolean; message?: string; project?: Project } {
  const projects = getProjectsFromStorage();
  if (projects.some(p => p.url === projectData.url)) {
    return { success: false, message: 'Project with this URL already exists.' };
  }
  const newProject: Project = { ...projectData, id: String(Date.now()) };
  const updatedProjects = [...projects, newProject];
  saveProjectsToStorage(updatedProjects);
  return { success: true, project: newProject };
}

export function dbDeleteProject(projectId: string): { success: boolean } {
  let projects = getProjectsFromStorage();
  projects = projects.filter(p => p.id !== projectId);
  saveProjectsToStorage(projects);
  return { success: true };
}
