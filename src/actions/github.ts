'use server';

import type { CodeFile } from '@/components/codepilot/types';
import { z } from 'zod';

const GITHUB_API_BASE = 'https://api.github.com';

const GithubFileSchema = z.object({
  type: z.enum(['file', 'dir']),
  path: z.string(),
  name: z.string(),
  download_url: z.string().nullable(),
});

const GithubRepoContentsSchema = z.array(GithubFileSchema);

function parseRepoUrl(url: string): { owner: string; repo: string } | null {
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

async function fetchRepoContents(
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
]

async function getFilesRecursively(
  owner: string,
  repo: string,
  path: string = ''
): Promise<CodeFile[]> {
  if (IGNORE_LIST.includes(path.split('/').pop() || '')) {
    return [];
  }

  const contents = await fetchRepoContents(owner, repo, path);
  let files: CodeFile[] = [];

  for (const item of contents) {
    if (item.type === 'dir') {
      const nestedFiles = await getFilesRecursively(owner, repo, item.path);
      files = files.concat(nestedFiles);
    } else if (item.type === 'file' && item.download_url) {
      const shouldIgnore = IGNORE_LIST.includes(item.name) || IGNORE_EXTENSIONS.some(ext => item.name.endsWith(ext));
      if (shouldIgnore) {
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
        console.error(`Error processing file ${item.path}:`, error);
      }
    }
  }
  return files;
}

export async function importFromGithub(
  url: string
): Promise<{ success: boolean; files?: CodeFile[]; error?: string }> {
  const repoInfo = parseRepoUrl(url);

  if (!repoInfo) {
    return { success: false, error: 'Invalid GitHub repository URL.' };
  }

  const { owner, repo } = repoInfo;

  try {
    const files = await getFilesRecursively(owner, repo);
    if (files.length === 0) {
      return {
        success: false,
        error: 'No readable files found. The repository might be empty, contain only unsupported file types, or be private.',
      };
    }
    return { success: true, files: files };
  } catch (error) {
    console.error('Failed to import from GitHub:', error);
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
