'use server';

import type { CodeFile, Commit } from '@/components/codepilot/types';
import { z } from 'zod';
import { dbGetUserById } from '@/lib/user-database';
import { Buffer } from 'buffer';

// A list of common files/directories to ignore
const IGNORE_LIST = [
    'package-lock.json',
    'yarn.lock',
    '.DS_Store',
    'node_modules',
    '.git',
    '.vscode',
    '.idea',
    'dist',
    'build',
];
const IGNORE_EXTENSIONS = [
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', // images
    '.mp4', '.mov', '.avi', '.webm', // videos
    '.mp3', '.wav', '.ogg', // audio
    '.zip', '.tar', '.gz', // archives
    '.pdf', '.doc', '.docx' // documents
];

function shouldIgnore(path: string): boolean {
    const name = path.split('/').pop() || '';
    return IGNORE_LIST.includes(name) || IGNORE_EXTENSIONS.some(ext => name.endsWith(ext));
}

// ====== Bitbucket API Types and Constants ======
const BITBUCKET_SERVER_API_BASE = '/rest/api/1.0';

type BitbucketServerInfo = { host: string; project: string; repo: string };


// ====== Authentication (reusable) ======
async function getAuthHeaders(userId?: string): Promise<HeadersInit> {
    const headers: HeadersInit = { 'Accept': 'application/json' };
    if (!userId) return headers;
    
    try {
        const user = await dbGetUserById(userId);
        if (user && user.bitbucketUsername && user.bitbucketAppPassword) {
            const credentials = `${user.bitbucketUsername}:${user.bitbucketAppPassword}`;
            const encodedCredentials = Buffer.from(credentials).toString('base64');
            headers['Authorization'] = `Basic ${encodedCredentials}`;
        }
    } catch (e) {
        console.error("Failed to get user credentials for Bitbucket auth", e);
    }
    return headers;
}

// ====== URL Parsing for Server ======
function parseBitbucketUrl(url: string): BitbucketServerInfo | null {
    try {
        const urlObj = new URL(url);
        // Bitbucket Server/Data Center URL: e.g., https://bitbucket.mycompany.com/projects/PROJ/repos/my-repo/browse
        const parts = urlObj.pathname.split('/').filter(Boolean);
        const projectsIndex = parts.indexOf('projects');
        const reposIndex = parts.indexOf('repos');

        if (projectsIndex !== -1 && reposIndex === projectsIndex + 2) {
             const project = parts[projectsIndex + 1];
             const repo = parts[reposIndex + 1];
             if (project && repo) {
                return { host: urlObj.origin, project, repo };
             }
        }
        return null;
    } catch (error) {
        console.error("URL Parsing Error:", error);
        return null;
    }
}


// ====== Zod Schemas ======
const BitbucketServerBranchSchema = z.object({ displayId: z.string(), isDefault: z.boolean() });
const BitbucketServerDefaultBranchSchema = z.object({ displayId: z.string() });
const BitbucketServerBranchesResponseSchema = z.object({
    values: z.array(BitbucketServerBranchSchema),
    isLastPage: z.boolean(),
    nextPageStart: z.number().optional().nullable(),
});

const BitbucketServerBrowseNodeSchema = z.object({
    path: z.object({ toString: z.string() }),
    type: z.enum(['FILE', 'DIRECTORY']),
});
const BitbucketServerBrowseResponseSchema = z.object({
    children: z.object({
        values: z.array(BitbucketServerBrowseNodeSchema),
        isLastPage: z.boolean(),
        nextPageStart: z.number().optional().nullable(),
    }),
});

const BitbucketServerCommitSchema = z.object({
  id: z.string(),
  message: z.string(),
  authorTimestamp: z.number(),
});
const BitbucketServerCommitsResponseSchema = z.object({
  values: z.array(BitbucketServerCommitSchema),
  isLastPage: z.boolean(),
  nextPageStart: z.number().optional().nullable(),
});


// ====== API Fetching Logic ======
async function fetchWithAuthFallback(url: string, userId: string, params: RequestInit = {}): Promise<Response> {
    let headersToUse: HeadersInit = { 'Accept': 'application/json', ...(params.headers || {}) };
    let response = await fetch(url, { ...params, headers: headersToUse, cache: 'no-store' });
    
    if (response.status === 401 || response.status === 403) {
        const authHeaders = await getAuthHeaders(userId);
        if (authHeaders.Authorization) {
            headersToUse = { ...headersToUse, ...authHeaders };
            response = await fetch(url, { ...params, headers: headersToUse, cache: 'no-store' });
        }
    }
    return response;
}

export async function fetchBitbucketBranches(url: string, userId: string): Promise<{ success: boolean; branches?: string[]; error?: string }> {
    const bitbucketInfo = parseBitbucketUrl(url);
    if (!bitbucketInfo) {
        return { success: false, error: 'Invalid Bitbucket Server repository URL format. Please use the format: https://<host>/projects/<project>/repos/<repo>' };
    }

    try {
        return await fetchBitbucketServerBranches(bitbucketInfo, userId);
    } catch (error) {
        console.error('Error fetching Bitbucket branches:', error);
        if (error instanceof Error) {
            return { success: false, error: `An unexpected error occurred: ${error.message}` };
        }
        return { success: false, error: 'An unknown error occurred while fetching branches.' };
    }
}

async function fetchBitbucketServerBranches(info: BitbucketServerInfo, userId: string): Promise<{ success: boolean; branches?: string[]; error?: string }> {
    const { host, project, repo } = info;
    const branches: string[] = [];
    let start = 0;
    let isLastPage = false;

    while (!isLastPage) {
        const branchesUrl = `${host}${BITBUCKET_SERVER_API_BASE}/projects/${project}/repos/${repo}/branches?start=${start}&limit=100`;
        const response = await fetchWithAuthFallback(branchesUrl, userId);

        if (!response.ok) {
            const errorText = await response.text().catch(()=>'');
            const errorDetail = (response.status === 401 || response.status === 403) 
                ? 'Access denied. The repository may be private. Please check your credentials.'
                : `Failed to fetch branches: ${response.statusText} ${errorText}`;
            return { success: false, error: branches.length > 0 ? undefined : errorDetail, branches: branches.length > 0 ? branches : undefined };
        }
        
        const data = await response.json();
        const parsedData = BitbucketServerBranchesResponseSchema.parse(data);
        branches.push(...parsedData.values.map(b => b.displayId));
        isLastPage = parsedData.isLastPage;
        if (parsedData.nextPageStart) start = parsedData.nextPageStart;
        else isLastPage = true;
    }

    if (branches.length === 0) return { success: false, error: 'No branches found. The repository might be empty or you may lack permissions.' };
    return { success: true, branches };
}

async function getMainBranch(info: BitbucketServerInfo, userId: string): Promise<string | null> {
    const { host, project, repo } = info;
    const defaultBranchUrl = `${host}${BITBUCKET_SERVER_API_BASE}/projects/${project}/repos/${repo}/branches/default`;
    const response = await fetchWithAuthFallback(defaultBranchUrl, userId);
    if (!response.ok) return null;
    const branchData = await response.json();
    const parsed = BitbucketServerDefaultBranchSchema.safeParse(branchData);
    return parsed.success ? parsed.data.displayId : null;
}

export async function loadBitbucketFiles(url: string, branch: string, userId: string): Promise<{ success: boolean; files?: CodeFile[]; error?: string }> {
    const bitbucketInfo = parseBitbucketUrl(url);
    if (!bitbucketInfo) {
        return { success: false, error: 'Invalid Bitbucket Server repository URL.' };
    }
    
    try {
        const mainBranch = await getMainBranch(bitbucketInfo, userId);
        if (!mainBranch) return { success: false, error: 'Could not determine the main branch for this repository.' };
        
        const files: CodeFile[] = await getBitbucketServerFilesRecursively(bitbucketInfo, branch, mainBranch, userId, '');

        if (files.length === 0) return { success: false, error: 'No readable files found in this branch.' };
        return { success: true, files };
    } catch (error) {
        console.error('Failed to import from Bitbucket repository:', error);
        return { success: false, error: `Could not fetch repository files. ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
}

async function getBitbucketServerFileContent(host: string, project: string, repo: string, commit: string, path: string, userId: string): Promise<string | null> {
    const url = `${host}${BITBUCKET_SERVER_API_BASE}/projects/${project}/repos/${repo}/raw/${path}?at=${commit}`;
    const response = await fetchWithAuthFallback(url, userId);
    if (!response.ok) return null;
    const content = await response.text();
    return content.includes('\uFFFD') ? null : content;
}

async function getBitbucketServerFilesRecursively(info: BitbucketServerInfo, branch: string, mainBranch: string, userId: string, path: string): Promise<CodeFile[]> {
    if (shouldIgnore(path)) return [];

    const { host, project, repo } = info;
    const files: CodeFile[] = [];
    let start = 0;
    let isLastPage = false;
    
    while (!isLastPage) {
        const url = `${host}${BITBUCKET_SERVER_API_BASE}/projects/${project}/repos/${repo}/browse/${path}?start=${start}&limit=100&at=${branch}`;
        const response = await fetchWithAuthFallback(url, userId);
        if (!response.ok) break;

        const data = await response.json();
        const parsedData = BitbucketServerBrowseResponseSchema.parse(data);

        for (const item of parsedData.children.values) {
            const itemPath = item.path.toString;
            if (shouldIgnore(itemPath)) continue;
            if (item.type === 'DIRECTORY') {
                files.push(...await getBitbucketServerFilesRecursively(info, branch, mainBranch, userId, itemPath));
            } else {
                const content = await getBitbucketServerFileContent(host, project, repo, branch, itemPath, userId);
                if (content === null) continue;

                let originalContent = content;
                if (branch !== mainBranch) {
                    originalContent = await getBitbucketServerFileContent(host, project, repo, mainBranch, itemPath, userId) ?? '';
                }
                const name = itemPath.split('/').pop() || '';
                const language = name.split('.').pop() || 'text';
                files.push({ id: itemPath, name, language, content, originalContent });
            }
        }
        isLastPage = parsedData.children.isLastPage;
        if (parsedData.children.nextPageStart) start = parsedData.children.nextPageStart;
        else isLastPage = true;
    }
    return files;
}

export async function fetchBitbucketFileCommits(url: string, branch: string, path: string, userId: string): Promise<{ success: boolean; commits?: Commit[]; error?: string }> {
    const bitbucketInfo = parseBitbucketUrl(url);
    if (!bitbucketInfo) return { success: false, error: 'Invalid Bitbucket Server repository URL.' };

    try {
        return await fetchBitbucketServerFileCommits(bitbucketInfo, branch, path, userId);
    } catch (error) {
        console.error('Error fetching Bitbucket commits:', error);
        return { success: false, error: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
}

async function fetchBitbucketServerFileCommits(info: BitbucketServerInfo, branch: string, path: string, userId: string): Promise<{ success: boolean; commits?: Commit[]; error?: string }> {
    const { host, project, repo } = info;
    const commits: Commit[] = [];
    let start = 0;
    let isLastPage = false;
    
    while (!isLastPage) {
        const commitsUrl = `${host}${BITBUCKET_SERVER_API_BASE}/projects/${project}/repos/${repo}/commits?path=${encodeURIComponent(path)}&until=${branch}&start=${start}&limit=100`;
        const response = await fetchWithAuthFallback(commitsUrl, userId);
        if (!response.ok) return { success: false, error: `Failed to fetch commits: ${response.statusText}` };

        const data = await response.json();
        const parsedData = BitbucketServerCommitsResponseSchema.parse(data);
        commits.push(...parsedData.values.map(c => ({ hash: c.id, message: c.message.split('\n')[0], date: new Date(c.authorTimestamp).toISOString() })));
        isLastPage = parsedData.isLastPage;
        if (parsedData.nextPageStart) start = parsedData.nextPageStart;
        else isLastPage = true;
    }
    return { success: true, commits };
}

export async function getBitbucketFileContentForCommit(url: string, commitHash: string, path: string, userId: string): Promise<{ success: boolean; content?: string; error?: string }> {
    const bitbucketInfo = parseBitbucketUrl(url);
    if (!bitbucketInfo) return { success: false, error: 'Invalid Bitbucket Server repository URL.' };
    
    const { host, project, repo } = bitbucketInfo;
    const contentUrl = `${host}${BITBUCKET_SERVER_API_BASE}/projects/${project}/repos/${repo}/raw/${path}?at=${commitHash}`;

    const response = await fetchWithAuthFallback(contentUrl, userId);
    if (!response.ok) return { success: false, error: 'Could not fetch file content for the specified commit.' };

    const content = await response.text();
    if (content.includes('\uFFFD')) return { success: false, error: 'Cannot display binary file content.' };
    
    return { success: true, content };
}
