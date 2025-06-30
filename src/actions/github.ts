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
const BITBUCKET_CLOUD_API_BASE = 'https://api.bitbucket.org/2.0';
const BITBUCKET_SERVER_API_BASE = '/rest/api/1.0';

type BitbucketCloudInfo = { type: 'cloud'; workspace: string; repo: string };
type BitbucketServerInfo = { type: 'server'; host: string; project: string; repo: string };
type BitbucketInfo = BitbucketCloudInfo | BitbucketServerInfo;


// ====== Authentication (reusable for both) ======
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

// ====== URL Parsing for Cloud and Server ======
function parseBitbucketUrl(url: string): BitbucketInfo | null {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'bitbucket.org') {
            const parts = urlObj.pathname.split('/').filter(Boolean);
            if (parts.length < 2) return null;
            const [workspace, repo] = parts;
            return { type: 'cloud', workspace, repo: repo.replace(/\.git$/, '') };
        } else {
            // Bitbucket Server/Data Center URL: e.g., https://bitbucket.mycompany.com/projects/PROJ/repos/my-repo/browse
            const parts = urlObj.pathname.split('/').filter(Boolean);
            const projectsIndex = parts.indexOf('projects');
            const reposIndex = parts.indexOf('repos');

            if (projectsIndex !== -1 && reposIndex === projectsIndex + 2) {
                 const project = parts[projectsIndex + 1];
                 const repo = parts[reposIndex + 1];
                 if (project && repo) {
                    return { type: 'server', host: urlObj.origin, project, repo };
                 }
            }
            return null;
        }
    } catch (error) {
        console.error("URL Parsing Error:", error);
        return null;
    }
}


// ====== Zod Schemas ======
// == Bitbucket Cloud Schemas
const BitbucketCloudEntrySchema = z.object({
    type: z.enum(['commit_file', 'commit_directory']),
    path: z.string(),
});
const BitbucketCloudSrcResponseSchema = z.object({
    values: z.array(BitbucketCloudEntrySchema),
    next: z.string().optional(),
});
const BitbucketCloudBranchSchema = z.object({ name: z.string() });
const BitbucketCloudBranchesResponseSchema = z.object({
    values: z.array(BitbucketCloudBranchSchema),
    next: z.string().optional(),
});
const BitbucketCloudCommitSchema = z.object({
  hash: z.string(),
  message: z.string(),
  date: z.string(),
});
const BitbucketCloudCommitsResponseSchema = z.object({
  values: z.array(BitbucketCloudCommitSchema),
  next: z.string().optional(),
});

// == Bitbucket Server Schemas
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
        return { success: false, error: 'Invalid Bitbucket repository URL format.' };
    }

    try {
        if (bitbucketInfo.type === 'cloud') {
            return await fetchBitbucketCloudBranches(bitbucketInfo, userId);
        } else {
            return await fetchBitbucketServerBranches(bitbucketInfo, userId);
        }
    } catch (error) {
        console.error('Error fetching Bitbucket branches:', error);
        if (error instanceof Error) {
            return { success: false, error: `An unexpected error occurred: ${error.message}` };
        }
        return { success: false, error: 'An unknown error occurred while fetching branches.' };
    }
}

async function fetchBitbucketCloudBranches(info: BitbucketCloudInfo, userId: string): Promise<{ success: boolean; branches?: string[]; error?: string }> {
    const { workspace, repo } = info;
    let currentUrl: string | undefined = `${BITBUCKET_CLOUD_API_BASE}/repositories/${workspace}/${repo}/refs/branches`;
    const branches: string[] = [];

    while (currentUrl) {
        const response = await fetchWithAuthFallback(currentUrl, userId);
        if (!response.ok) {
            const errorText = await response.text().catch(()=>'');
            const errorDetail = (response.status === 401 || response.status === 403) 
                ? 'Access denied. The repository may be private. Please check your credentials.'
                : `Failed to fetch branches: ${response.statusText} ${errorText}`;
            return { success: false, error: branches.length > 0 ? undefined : errorDetail, branches: branches.length > 0 ? branches : undefined };
        }
        
        const data = await response.json();
        const parsedData = BitbucketCloudBranchesResponseSchema.parse(data);
        branches.push(...parsedData.values.map(b => b.name));
        currentUrl = parsedData.next;
    }

    if (branches.length === 0) return { success: false, error: 'No branches found. The repository might be empty or you lack permissions.' };
    return { success: true, branches };
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

async function getMainBranch(info: BitbucketInfo, userId: string): Promise<string | null> {
    if (info.type === 'cloud') {
        const { workspace, repo } = info;
        const repoDetailsUrl = `${BITBUCKET_CLOUD_API_BASE}/repositories/${workspace}/${repo}`;
        const response = await fetchWithAuthFallback(repoDetailsUrl, userId);
        if (!response.ok) return null;
        const repoData = await response.json();
        return repoData?.mainbranch?.name || null;
    } else {
        const { host, project, repo } = info;
        const defaultBranchUrl = `${host}${BITBUCKET_SERVER_API_BASE}/projects/${project}/repos/${repo}/branches/default`;
        const response = await fetchWithAuthFallback(defaultBranchUrl, userId);
        if (!response.ok) return null;
        const branchData = await response.json();
        const parsed = BitbucketServerDefaultBranchSchema.safeParse(branchData);
        return parsed.success ? parsed.data.displayId : null;
    }
}

export async function loadBitbucketFiles(url: string, branch: string, userId: string): Promise<{ success: boolean; files?: CodeFile[]; error?: string }> {
    const bitbucketInfo = parseBitbucketUrl(url);
    if (!bitbucketInfo) {
        return { success: false, error: 'Invalid Bitbucket repository URL.' };
    }
    
    try {
        const mainBranch = await getMainBranch(bitbucketInfo, userId);
        if (!mainBranch) return { success: false, error: 'Could not determine the main branch for this repository.' };
        
        const authHeaders = await getAuthHeaders(userId);
        
        let files: CodeFile[] = [];
        if (bitbucketInfo.type === 'cloud') {
            files = await getBitbucketCloudFilesRecursively(bitbucketInfo, branch, mainBranch, authHeaders, '');
        } else {
            files = await getBitbucketServerFilesRecursively(bitbucketInfo, branch, mainBranch, authHeaders, '');
        }

        if (files.length === 0) return { success: false, error: 'No readable files found in this branch.' };
        return { success: true, files };
    } catch (error) {
        console.error('Failed to import from Bitbucket repository:', error);
        return { success: false, error: `Could not fetch repository files. ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
}

// Cloud File Fetching
async function getBitbucketCloudFileContent(workspace: string, repo: string, commit: string, path: string, headers: HeadersInit): Promise<string | null> {
    const url = `${BITBUCKET_CLOUD_API_BASE}/repositories/${workspace}/${repo}/src/${commit}/${path}`;
    const response = await fetch(url, { headers, cache: 'no-store' });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) { // Is file, not directory
        const content = await response.text();
        return content.includes('\uFFFD') ? null : content; // Basic binary check
    }
    return null;
}

async function getBitbucketCloudFilesRecursively(info: BitbucketCloudInfo, branch: string, mainBranch: string, headers: HeadersInit, path: string): Promise<CodeFile[]> {
    if (shouldIgnore(path)) return [];

    const { workspace, repo } = info;
    const files: CodeFile[] = [];
    let currentUrl: string | undefined = `${BITBUCKET_CLOUD_API_BASE}/repositories/${workspace}/${repo}/src/${branch}/${path}`;

    while(currentUrl) {
        const response = await fetch(currentUrl, { headers, cache: 'no-store' });
        if (!response.ok) break;

        const data = await response.json();
        const parsedData = BitbucketCloudSrcResponseSchema.parse(data);

        for (const item of parsedData.values) {
            if (shouldIgnore(item.path)) continue;
            if (item.type === 'commit_directory') {
                files.push(...await getBitbucketCloudFilesRecursively(info, branch, mainBranch, headers, item.path));
            } else if (item.type === 'commit_file') {
                const content = await getBitbucketCloudFileContent(workspace, repo, branch, item.path, headers);
                if (content === null) continue;
                
                let originalContent = content;
                if (branch !== mainBranch) {
                    originalContent = await getBitbucketCloudFileContent(workspace, repo, mainBranch, item.path, headers) ?? '';
                }
                const name = item.path.split('/').pop() || '';
                const language = name.split('.').pop() || 'text';
                files.push({ id: item.path, name, language, content, originalContent });
            }
        }
        currentUrl = parsedData.next;
    }
    return files;
}

// Server File Fetching
async function getBitbucketServerFileContent(host: string, project: string, repo: string, commit: string, path: string, headers: HeadersInit): Promise<string | null> {
    const url = `${host}${BITBUCKET_SERVER_API_BASE}/projects/${project}/repos/${repo}/raw/${path}?at=${commit}`;
    const response = await fetch(url, { headers, cache: 'no-store' });
    if (!response.ok) return null;
    const content = await response.text();
    return content.includes('\uFFFD') ? null : content;
}

async function getBitbucketServerFilesRecursively(info: BitbucketServerInfo, branch: string, mainBranch: string, headers: HeadersInit, path: string): Promise<CodeFile[]> {
    if (shouldIgnore(path)) return [];

    const { host, project, repo } = info;
    const files: CodeFile[] = [];
    let start = 0;
    let isLastPage = false;
    
    while (!isLastPage) {
        const url = `${host}${BITBUCKET_SERVER_API_BASE}/projects/${project}/repos/${repo}/browse/${path}?start=${start}&limit=100&at=${branch}`;
        const response = await fetch(url, { headers, cache: 'no-store' });
        if (!response.ok) break;

        const data = await response.json();
        const parsedData = BitbucketServerBrowseResponseSchema.parse(data);

        for (const item of parsedData.children.values) {
            const itemPath = item.path.toString;
            if (shouldIgnore(itemPath)) continue;
            if (item.type === 'DIRECTORY') {
                files.push(...await getBitbucketServerFilesRecursively(info, branch, mainBranch, headers, itemPath));
            } else {
                const content = await getBitbucketServerFileContent(host, project, repo, branch, itemPath, headers);
                if (content === null) continue;

                let originalContent = content;
                if (branch !== mainBranch) {
                    originalContent = await getBitbucketServerFileContent(host, project, repo, mainBranch, itemPath, headers) ?? '';
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
    if (!bitbucketInfo) return { success: false, error: 'Invalid Bitbucket repository URL.' };

    try {
        if (bitbucketInfo.type === 'cloud') {
            return await fetchBitbucketCloudFileCommits(bitbucketInfo, branch, path, userId);
        } else {
            return await fetchBitbucketServerFileCommits(bitbucketInfo, branch, path, userId);
        }
    } catch (error) {
        console.error('Error fetching Bitbucket commits:', error);
        return { success: false, error: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
}

async function fetchBitbucketCloudFileCommits(info: BitbucketCloudInfo, branch: string, path: string, userId: string): Promise<{ success: boolean; commits?: Commit[]; error?: string }> {
    const { workspace, repo } = info;
    const commits: Commit[] = [];
    let currentUrl: string | undefined = `${BITBUCKET_CLOUD_API_BASE}/repositories/${workspace}/${repo}/commits/${branch}?path=${encodeURIComponent(path)}&fields=values.hash,values.message,values.date,next`;

    while (currentUrl) {
        const response = await fetchWithAuthFallback(currentUrl, userId);
        if (!response.ok) return { success: false, error: `Failed to fetch commits: ${response.statusText}` };

        const data = await response.json();
        const parsedData = BitbucketCloudCommitsResponseSchema.parse(data);
        commits.push(...parsedData.values.map(c => ({...c, message: c.message.split('\n')[0] })));
        currentUrl = parsedData.next;
    }
    return { success: true, commits };
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
    if (!bitbucketInfo) return { success: false, error: 'Invalid Bitbucket repository URL.' };
    
    let contentUrl = '';
    if (bitbucketInfo.type === 'cloud') {
        const { workspace, repo } = bitbucketInfo;
        contentUrl = `${BITBUCKET_CLOUD_API_BASE}/repositories/${workspace}/${repo}/src/${commitHash}/${path}`;
    } else {
        const { host, project, repo } = bitbucketInfo;
        contentUrl = `${host}${BITBUCKET_SERVER_API_BASE}/projects/${project}/repos/${repo}/raw/${path}?at=${commitHash}`;
    }

    const response = await fetchWithAuthFallback(contentUrl, userId);
    if (!response.ok) return { success: false, error: 'Could not fetch file content for the specified commit.' };

    const content = await response.text();
    if (content.includes('\uFFFD')) return { success: false, error: 'Cannot display binary file content.' };
    
    return { success: true, content };
}
