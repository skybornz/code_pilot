'use server';

import type { CodeFile } from '@/components/codepilot/types';
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

// ====== GitHub Specific ======
const GITHUB_API_BASE = 'https://api.github.com';

const GithubFileSchema = z.object({
  type: z.enum(['file', 'dir']),
  path: z.string(),
  name: z.string(),
  download_url: z.string().nullable(),
});

const GithubRepoContentsSchema = z.array(GithubFileSchema);

function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname !== 'github.com') {
      return null;
    }
    const parts = urlObj.pathname.split('/').filter(Boolean);
    if (parts.length < 2) {
      return null;
    }
    const [owner, repo] = parts;
    return { owner, repo };
  } catch (error) {
    return null;
  }
}

async function fetchGithubRepoContents(
  owner: string,
  repo: string,
  path: string = ''
): Promise<any[]> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      // To avoid rate limiting on public repos, it's better to use an auth token
      // 'Authorization': `token ${process.env.GITHUB_TOKEN}`
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Failed to fetch repo contents from ${url}: ${response.status} ${response.statusText}. Message: ${errorData.message}`
    );
  }

  const contents = await response.json();
  return GithubRepoContentsSchema.parse(contents);
}

async function getGithubFilesRecursively(
  owner: string,
  repo: string,
  path: string = ''
): Promise<CodeFile[]> {
  if (shouldIgnore(path)) {
    return [];
  }

  const contents = await fetchGithubRepoContents(owner, repo, path);
  let files: CodeFile[] = [];

  for (const item of contents) {
    if (item.type === 'dir') {
      const nestedFiles = await getGithubFilesRecursively(owner, repo, item.path);
      files = files.concat(nestedFiles);
    } else if (item.type === 'file' && item.download_url) {
        if (shouldIgnore(item.path)) {
            continue;
        }
      
      try {
        const fileResponse = await fetch(item.download_url, { cache: 'no-store' });
        if (!fileResponse.ok) {
          console.warn(`Could not fetch file: ${item.download_url}`);
          continue;
        }
        const content = await fileResponse.text();
        const language = item.name.split('.').pop() || 'text';

        // A simple check for binary content
        if (content.includes('\uFFFD')) {
            continue;
        }

        files.push({
          id: item.path,
          name: item.name,
          language: language,
          content: content,
        });
      } catch (error) {
        console.error(`Error processing GitHub file ${item.path}:`, error);
      }
    }
  }
  return files;
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

async function getBitbucketDefaultBranch(workspace: string, repo: string): Promise<string | null> {
    try {
        const url = `${BITBUCKET_API_BASE}/repositories/${workspace}/${repo}`;
        const response = await fetch(url, { headers: { 'Accept': 'application/json' }, cache: 'no-store' });
        if (!response.ok) {
            console.error(`Failed to fetch Bitbucket repo info: ${response.statusText}`);
            return 'master'; // Fallback
        }
        const data = await response.json();
        return data?.mainbranch?.name || 'master';
    } catch (error) {
        console.error('Error fetching default branch:', error);
        return 'master'; // Fallback in case of error
    }
}

async function getBitbucketFilesRecursively(
    workspace: string,
    repo: string,
    branch: string,
    path: string = ''
): Promise<CodeFile[]> {
    if (shouldIgnore(path)) {
        return [];
    }

    const files: CodeFile[] = [];
    const url = `${BITBUCKET_API_BASE}/repositories/${workspace}/${repo}/src/${branch}/${path}`;

    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
        console.warn(`Could not fetch Bitbucket path: ${url}`);
        return [];
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        // It's a directory
        let currentResponse = response;
        let hasNextPage = true;

        while (hasNextPage) {
            const data = await currentResponse.json();
            const parsedData = BitbucketSrcResponseSchema.parse(data);

            for (const item of parsedData.values) {
                const nestedFiles = await getBitbucketFilesRecursively(workspace, repo, branch, item.path);
                files.push(...nestedFiles);
            }

            if (parsedData.next) {
                currentResponse = await fetch(parsedData.next, { cache: 'no-store' });
            } else {
                hasNextPage = false;
            }
        }
    } else {
        // It's a file
        const content = await response.text();
        if (!content.includes('\uFFFD')) { // Binary check
            const name = path.split('/').pop() || '';
            const language = name.split('.').pop() || 'text';
            return [{ id: path, name, language, content }];
        }
    }
    
    return files;
}

// ====== Main Exported Function ======
export async function importFromGithub(
  url: string
): Promise<{ success: boolean; files?: CodeFile[]; error?: string }> {
  const githubInfo = parseGithubUrl(url);
  const bitbucketInfo = parseBitbucketUrl(url);

  try {
    let files: CodeFile[] = [];
    if (githubInfo) {
      files = await getGithubFilesRecursively(githubInfo.owner, githubInfo.repo);
    } else if (bitbucketInfo) {
      const branch = await getBitbucketDefaultBranch(bitbucketInfo.workspace, bitbucketInfo.repo);
      if (!branch) {
          return { success: false, error: 'Could not find the default branch for the repository. The repository might be private or empty.' };
      }
      files = await getBitbucketFilesRecursively(bitbucketInfo.workspace, bitbucketInfo.repo, branch);
    } else {
      return { success: false, error: 'Invalid GitHub or Bitbucket repository URL.' };
    }

    if (files.length === 0) {
      return {
        success: false,
        error: 'No readable files found. The repository might be empty, contain only unsupported file types, or be private.',
      };
    }
    return { success: true, files: files };
  } catch (error) {
    console.error('Failed to import from repository:', error);
    if (error instanceof Error) {
      return {
        success: false,
        error: `Could not fetch repository. ${error.message}`,
      };
    }
    return {
      success: false,
      error: 'An unknown error occurred while fetching the repository.',
    };
  }
}
