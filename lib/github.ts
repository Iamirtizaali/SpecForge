import { Octokit } from '@octokit/rest';
import { getConfig } from './config';
import { GitHubError } from './errors';
import { LIMITS } from './constants';
import type { FetchedFile, RepoMetadata } from './types';

interface RepoValidation {
  valid: boolean;
  defaultBranch: string;
  description?: string;
  primaryLanguage?: string;
}

export interface FetchedContent {
  metadata: RepoMetadata;
  files: FetchedFile[];
  fileTree: string;
  readme: string;
  truncated: boolean;
}

const GITHUB_TIMEOUT_MS = 10_000;

function createOctokitClient(): Octokit {
  const { githubToken } = getConfig();
  return new Octokit({
    auth: githubToken,
    request: { timeout: GITHUB_TIMEOUT_MS },
  });
}

export async function validateRepository(
  owner: string,
  repo: string
): Promise<RepoValidation> {
  const octokit = createOctokitClient();

  try {
    const response = await octokit.rest.repos.get({ owner, repo });
    return {
      valid: true,
      defaultBranch: response.data.default_branch,
      description: response.data.description ?? undefined,
      primaryLanguage: response.data.language ?? undefined,
    };
  } catch (error: unknown) {
    throw mapGitHubError(error, owner, repo);
  }
}

export async function resolveCommitSHA(
  owner: string,
  repo: string,
  branch: string
): Promise<string> {
  const octokit = createOctokitClient();

  try {
    const response = await octokit.rest.repos.getBranch({
      owner,
      repo,
      branch,
    });
    return response.data.commit.sha;
  } catch (error: unknown) {
    throw mapGitHubError(error, owner, repo);
  }
}

const PRIORITY_FILES = {
  readme: ['README', 'README.md', 'README.rst', 'README.txt'],
  manifest: [
    'package.json',
    'requirements.txt',
    'Cargo.toml',
    'pom.xml',
    'go.mod',
    'Gemfile',
    'pyproject.toml',
    'composer.json',
    'Pipfile',
    'build.gradle',
  ],
  config: [
    'tsconfig.json',
    '.eslintrc',
    '.eslintrc.js',
    '.eslintrc.json',
    'next.config.js',
    'next.config.ts',
    'next.config.mjs',
    'vite.config.ts',
    'vite.config.js',
    'webpack.config.js',
    'docker-compose.yml',
    'Dockerfile',
    'Makefile',
    'tailwind.config.ts',
    'tailwind.config.js',
    'svelte.config.js',
    'nuxt.config.ts',
  ],
  entry: [
    'index.ts',
    'index.js',
    'index.tsx',
    'index.jsx',
    'main.ts',
    'main.js',
    'main.py',
    'app.ts',
    'app.js',
    'app.py',
    'server.ts',
    'server.js',
    'server.py',
  ],
};

const BINARY_EXTENSIONS = new Set([
  // images
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'svg', 'tiff', 'avif',
  // fonts
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  // archives
  'zip', 'tar', 'gz', 'bz2', '7z', 'rar', 'xz',
  // compiled
  'exe', 'dll', 'so', 'dylib', 'class', 'jar', 'wasm', 'o', 'a',
  // media
  'mp3', 'mp4', 'mov', 'avi', 'webm', 'wav', 'flac', 'ogg',
  // docs (binary formats)
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  // misc
  'bin', 'dat', 'db', 'sqlite', 'sqlite3', 'lock',
]);

function getExtension(path: string): string {
  const last = path.split('/').pop() || '';
  const dot = last.lastIndexOf('.');
  if (dot === -1) return '';
  return last.slice(dot + 1).toLowerCase();
}

function isBinaryPath(path: string): boolean {
  return BINARY_EXTENSIONS.has(getExtension(path));
}

function basenameOf(path: string): string {
  return path.split('/').pop() || path;
}

function depthOf(path: string): number {
  return path.split('/').length - 1;
}

function priorityTier(path: string): number {
  const base = basenameOf(path);
  if (PRIORITY_FILES.readme.includes(base)) return 0;
  if (PRIORITY_FILES.manifest.includes(base)) return 1;
  if (PRIORITY_FILES.config.includes(base)) return 2;
  if (PRIORITY_FILES.entry.includes(base)) return 3;
  return 4;
}

function isLikelyTextSourceFile(path: string): boolean {
  const ext = getExtension(path);
  if (!ext) return true;
  const sourceExts = new Set([
    'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
    'py', 'rb', 'go', 'rs', 'java', 'kt', 'swift',
    'c', 'cc', 'cpp', 'h', 'hpp', 'cs',
    'php', 'pl', 'lua', 'r',
    'json', 'yaml', 'yml', 'toml', 'xml',
    'md', 'markdown', 'rst', 'txt',
    'html', 'htm', 'css', 'scss', 'sass', 'less',
    'sh', 'bash', 'zsh', 'fish', 'ps1',
    'sql', 'graphql', 'gql', 'proto',
    'vue', 'svelte', 'astro',
    'dockerfile', 'makefile',
    'env', 'gitignore', 'editorconfig',
  ]);
  return sourceExts.has(ext);
}

export async function fetchRepositoryContent(
  owner: string,
  repo: string,
  defaultBranch: string,
  commitSha: string,
  description?: string,
  primaryLanguage?: string
): Promise<FetchedContent> {
  const octokit = createOctokitClient();

  let treeResponse;
  try {
    treeResponse = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: commitSha,
      recursive: 'true',
    });
  } catch (error: unknown) {
    throw mapGitHubError(error, owner, repo);
  }

  const allTreeEntries = treeResponse.data.tree;
  const allFiles = allTreeEntries.filter((e) => e.type === 'blob' && e.path);

  if (allFiles.length > LIMITS.MAX_FILE_TREE) {
    throw new GitHubError(
      `Repository contains ${allFiles.length} files which exceeds the maximum of ${LIMITS.MAX_FILE_TREE}. Please try a smaller repository.`,
      'REPO_TOO_LARGE'
    );
  }

  // Sort candidates by priority, depth, then alphabetical
  const candidates = allFiles
    .filter((e) => e.path && !isBinaryPath(e.path))
    .filter((e) => isLikelyTextSourceFile(e.path!))
    .map((e) => ({
      path: e.path as string,
      tier: priorityTier(e.path as string),
      depth: depthOf(e.path as string),
      size: e.size ?? 0,
    }))
    .sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      if (a.depth !== b.depth) return a.depth - b.depth;
      return a.path.localeCompare(b.path);
    });

  const fetched: FetchedFile[] = [];
  let cumulativeSize = 0;
  let readmeContent = '';

  for (const candidate of candidates) {
    if (fetched.length >= LIMITS.MAX_FILES) break;
    if (cumulativeSize >= LIMITS.MAX_TOTAL_SIZE) break;

    let content: string;
    try {
      const blobResponse = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: candidate.path,
        ref: commitSha,
      });

      // getContent can return an array (dir) or object (file)
      const data = blobResponse.data;
      if (Array.isArray(data) || data.type !== 'file' || !('content' in data)) {
        continue;
      }

      // Content is base64-encoded
      content = Buffer.from(data.content, 'base64').toString('utf-8');
    } catch {
      continue;
    }

    let truncated = false;
    if (content.length > LIMITS.MAX_FILE_SIZE) {
      content = content.slice(0, LIMITS.MAX_FILE_SIZE) +
        '\n\n[... file truncated at 50KB ...]';
      truncated = true;
    }

    // Cumulative size check — skip if it would exceed budget
    if (cumulativeSize + content.length > LIMITS.MAX_TOTAL_SIZE) {
      const remaining = LIMITS.MAX_TOTAL_SIZE - cumulativeSize;
      if (remaining < 500) break;
      content = content.slice(0, remaining) + '\n\n[... truncated to fit budget ...]';
      truncated = true;
    }

    fetched.push({
      path: candidate.path,
      content,
      size: content.length,
      truncated,
    });
    cumulativeSize += content.length;

    if (PRIORITY_FILES.readme.includes(basenameOf(candidate.path)) && !readmeContent) {
      readmeContent = content;
    }
  }

  const fileTree = formatFileTree(
    allFiles.map((e) => e.path as string).slice(0, LIMITS.MAX_FILE_TREE)
  );

  const metadata: RepoMetadata = {
    owner,
    repo,
    defaultBranch,
    commitSha,
    description,
    fileCount: allFiles.length,
    primaryLanguage,
  };

  return {
    metadata,
    files: fetched,
    fileTree,
    readme: readmeContent,
    truncated: candidates.length > fetched.length,
  };
}

function formatFileTree(paths: string[]): string {
  // Render as indented directory listing, capped for prompt size.
  const sorted = [...paths].sort();
  const lines: string[] = [];
  const MAX_LINES = 2000;
  for (const p of sorted) {
    if (lines.length >= MAX_LINES) {
      lines.push(`... (${sorted.length - MAX_LINES} more files)`);
      break;
    }
    const depth = depthOf(p);
    lines.push(`${'  '.repeat(depth)}${basenameOf(p)}`);
  }
  return lines.join('\n');
}

function mapGitHubError(error: unknown, owner: string, repo: string): GitHubError {
  if (isOctokitError(error)) {
    const status = error.status;

    if (status === 404) {
      return new GitHubError(
        `Repository '${owner}/${repo}' was not found. Please check the URL and ensure the repository exists.`,
        'REPO_NOT_FOUND'
      );
    }

    if (status === 403) {
      const rateLimitRemaining = error.response?.headers?.['x-ratelimit-remaining'];
      if (rateLimitRemaining === '0') {
        const resetTimestamp = error.response?.headers?.['x-ratelimit-reset'];
        const resetMessage = resetTimestamp
          ? ` Resets at ${new Date(Number(resetTimestamp) * 1000).toISOString()}.`
          : '';
        return new GitHubError(
          `GitHub API rate limit exceeded.${resetMessage}`,
          'GITHUB_RATE_LIMITED'
        );
      }
      return new GitHubError(
        `Repository '${owner}/${repo}' is private or requires authentication. Only public repositories are supported.`,
        'REPO_PRIVATE'
      );
    }

    if (status === 409) {
      return new GitHubError(
        `Repository '${owner}/${repo}' appears to be empty.`,
        'REPO_NOT_FOUND'
      );
    }

    if (status >= 500) {
      return new GitHubError(
        'GitHub API is temporarily unavailable. Please try again later.',
        'GITHUB_UNAVAILABLE'
      );
    }
  }

  if (isTimeoutError(error)) {
    return new GitHubError(
      'GitHub API request timed out. Please try again later.',
      'GITHUB_UNAVAILABLE'
    );
  }

  return new GitHubError(
    'Unable to reach GitHub API. Please try again later.',
    'GITHUB_UNAVAILABLE'
  );
}

function isOctokitError(
  error: unknown
): error is { status: number; response?: { headers?: Record<string, string> } } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number'
  );
}

function isTimeoutError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    if ('name' in error && (error as { name: string }).name === 'AbortError') {
      return true;
    }
    if (
      'message' in error &&
      typeof (error as { message: string }).message === 'string' &&
      (error as { message: string }).message.toLowerCase().includes('timeout')
    ) {
      return true;
    }
  }
  return false;
}
