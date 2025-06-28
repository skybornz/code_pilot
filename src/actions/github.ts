'use server';

import type { CodeFile, Commit } from '@/components/codepilot/types';
import { z } from 'zod';

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

// ====== Bitbucket Specific ======
const BITBUCKET_API_BASE = 'https://api.bitbucket.org/2.0';

const BitbucketEntrySchema = z.object({
    type: z.enum(['commit_file', 'commit_directory']),
    path: z.string(),
});
const BitbucketSrcResponseSchema = z.object({
    values: z.array(BitbucketEntrySchema),
    next: z.string().optional(),
});

function parseBitbucketUrl(url: string): { workspace: string; repo: string } | null {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname !== 'bitbucket.org') {
            return null;
        }
        const parts = urlObj.pathname.split('/').filter(Boolean);
        if (parts.length < 2) {
            return null;
        }
        const [workspace, repo] = parts;
        return { workspace, repo: repo.replace(/\.git$/, '') };
    } catch (error) {
        return null;
    }
}

const BitbucketBranchSchema = z.object({ name: z.string() });
const BitbucketBranchesResponseSchema = z.object({
    values: z.array(BitbucketBranchSchema),
    next: z.string().optional(),
});

export async function fetchBitbucketBranches(url: string): Promise<{ success: boolean; branches?: string[]; error?: string }> {
    const bitbucketInfo = parseBitbucketUrl(url);
    if (!bitbucketInfo) {
        return { success: false, error: 'Invalid Bitbucket repository URL.' };
    }
    const { workspace, repo } = bitbucketInfo;

    const branchesUrl = `${BITBUCKET_API_BASE}/repositories/${workspace}/${repo}/refs/branches`;
    try {
        let currentUrl: string | undefined = branchesUrl;
        const branches: string[] = [];

        while (currentUrl) {
            const response = await fetch(currentUrl, { headers: { 'Accept': 'application/json' }, cache: 'no-store' });
            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData?.error?.message || response.statusText;
                return { success: false, error: `Failed to fetch branches: ${errorMessage}` };
            }
            const data = await response.json();
            const parsedData = BitbucketBranchesResponseSchema.parse(data);
            branches.push(...parsedData.values.map(b => b.name));
            currentUrl = parsedData.next;
        }
        
        if (branches.length === 0) {
            return { success: false, error: 'No branches found. The repository might be private or empty.' };
        }
        return { success: true, branches };
    } catch (error) {
        console.error('Error fetching Bitbucket branches:', error);
        if (error instanceof Error) {
            return { success: false, error: `An unexpected error occurred: ${error.message}` };
        }
        return { success: false, error: 'An unknown error occurred while fetching branches.' };
    }
}

async function getBitbucketFileContent(workspace: string, repo: string, branchOrCommit: string, path: string): Promise<string | null> {
    const url = `${BITBUCKET_API_BASE}/repositories/${workspace}/${repo}/src/${branchOrCommit}/${path}`;
    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) {
        return null;
    }

    const contentType = response.headers.get('content-type');
    // It's a file if it's not JSON (which represents a directory listing)
    if (contentType && !contentType.includes('application/json')) {
        const content = await response.text();
        if (!content.includes('\uFFFD')) { // Basic binary file check
            return content;
        }
    }
    return null; // Is a directory or a binary file
}


async function getBitbucketFilesRecursively(
    workspace: string,
    repo: string,
    branch: string,
    mainBranch: string,
    path: string = ''
): Promise<CodeFile[]> {
    if (shouldIgnore(path)) {
        return [];
    }

    const url = `${BITBUCKET_API_BASE}/repositories/${workspace}/${repo}/src/${branch}/${path}`;

    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
        console.warn(`Could not fetch Bitbucket path: ${url}`);
        return [];
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        // It's a directory
        const files: CodeFile[] = [];
        let currentUrl: string | undefined = url;

        while (currentUrl) {
            const pageResponse = await fetch(currentUrl, { cache: 'no-store' });
            if (!pageResponse.ok) {
                console.warn(`Could not fetch Bitbucket page: ${currentUrl}`);
                break;
            }

            const data = await pageResponse.json();
            const parsedData = BitbucketSrcResponseSchema.parse(data);

            const promises = parsedData.values.map(item => 
                getBitbucketFilesRecursively(workspace, repo, branch, mainBranch, item.path)
            );
            const nestedFilesArray = await Promise.all(promises);
            for (const nestedFiles of nestedFilesArray) {
                files.push(...nestedFiles);
            }

            currentUrl = parsedData.next;
        }
        return files;

    } else {
        // It's a file
        const content = await response.text();
        if (!content.includes('\uFFFD')) { // Binary check
            const name = path.split('/').pop() || '';
            const language = name.split('.').pop() || 'text';
            
            let originalContent = content;
            // Only fetch from main branch if the selected branch is different
            if (branch !== mainBranch) {
                originalContent = await getBitbucketFileContent(workspace, repo, mainBranch, path) ?? '';
            }

            return [{ id: path, name, language, content, originalContent }];
        }
    }
    
    return []; // Return empty for binary files or other unhandled cases
}

export async function loadBitbucketFiles(url: string, branch: string): Promise<{ success: boolean; files?: CodeFile[]; error?: string }> {
    const bitbucketInfo = parseBitbucketUrl(url);
    if (!bitbucketInfo) {
        return { success: false, error: 'Invalid Bitbucket repository URL.' };
    }
    const { workspace, repo } = bitbucketInfo;

    try {
        // 1. Get main branch name
        const repoDetailsUrl = `${BITBUCKET_API_BASE}/repositories/${workspace}/${repo}`;
        const repoDetailsResponse = await fetch(repoDetailsUrl, { headers: { 'Accept': 'application/json' }, cache: 'no-store' });
        if (!repoDetailsResponse.ok) {
            return { success: false, error: 'Could not fetch repository details to determine the main branch.' };
        }
        const repoData = await repoDetailsResponse.json();
        const mainBranch = repoData?.mainbranch?.name;

        if (!mainBranch) {
            return { success: false, error: 'Could not determine the main branch for this repository.' };
        }


        const files = await getBitbucketFilesRecursively(workspace, repo, branch, mainBranch);
        if (files.length === 0) {
            return {
                success: false,
                error: 'No readable files found in this branch. The branch might be empty or contain only unsupported file types.',
            };
        }
        return { success: true, files };
    } catch (error) {
        console.error('Failed to import from Bitbucket repository:', error);
        if (error instanceof Error) {
            return {
                success: false,
                error: `Could not fetch repository files. ${error.message}`,
            };
        }
        return {
            success: false,
            error: 'An unknown error occurred while fetching the repository files.',
        };
    }
}

const BitbucketCommitSchema = z.object({
  hash: z.string(),
  message: z.string(),
  date: z.string(),
});
const BitbucketCommitsResponseSchema = z.object({
  values: z.array(BitbucketCommitSchema),
  next: z.string().optional(),
});

export async function fetchBitbucketFileCommits(url: string, branch: string, path: string): Promise<{ success: boolean; commits?: Commit[]; error?: string }> {
    const bitbucketInfo = parseBitbucketUrl(url);
    if (!bitbucketInfo) {
        return { success: false, error: 'Invalid Bitbucket repository URL.' };
    }
    const { workspace, repo } = bitbucketInfo;
    
    const commitsUrl = `${BITBUCKET_API_BASE}/repositories/${workspace}/${repo}/commits/${branch}?path=${encodeURIComponent(path)}&fields=values.hash,values.message,values.date`;
    try {
        const commits: Commit[] = [];
        let currentUrl: string | undefined = commitsUrl;

        while (currentUrl) {
            const response = await fetch(currentUrl, { headers: { 'Accept': 'application/json' }, cache: 'no-store' });
            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData?.error?.message || response.statusText;
                return { success: false, error: `Failed to fetch commits: ${errorMessage}` };
            }
            const data = await response.json();
            const parsedData = BitbucketCommitsResponseSchema.parse(data);
            commits.push(...parsedData.values.map(c => ({...c, message: c.message.split('\n')[0] }))); // take only first line of commit message
            currentUrl = parsedData.next;
        }
        
        return { success: true, commits };
    } catch (error) {
        console.error('Error fetching Bitbucket commits:', error);
        if (error instanceof Error) {
            return { success: false, error: `An unexpected error occurred: ${error.message}` };
        }
        return { success: false, error: 'An unknown error occurred while fetching commits.' };
    }
}

export async function getBitbucketFileContentForCommit(url: string, commitHash: string, path: string): Promise<{ success: boolean; content?: string; error?: string }> {
    const bitbucketInfo = parseBitbucketUrl(url);
    if (!bitbucketInfo) {
        return { success: false, error: 'Invalid Bitbucket repository URL.' };
    }
    const { workspace, repo } = bitbucketInfo;
    const content = await getBitbucketFileContent(workspace, repo, commitHash, path);
    if (content !== null) {
        return { success: true, content };
    }
    return { success: false, error: 'Could not fetch file content for the specified commit.' };
}
