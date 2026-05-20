import { NextRequest, NextResponse } from 'next/server';
import {
  validateRepository,
  resolveCommitSHA,
  fetchRepositoryContent,
} from '@/lib/github';
import { analyzeRepository } from '@/lib/openrouter';
import { generateSpecs } from '@/lib/spec-generator';
import {
  ValidationError,
  GitHubError,
  AIAnalysisError,
} from '@/lib/errors';
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  ErrorResponse,
  ErrorCode,
} from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

const GITHUB_URL_REGEX =
  /^https:\/\/github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+?)(?:\.git)?\/?$/;

function parseGitHubUrl(url: string): { owner: string; repo: string } {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new ValidationError('A GitHub repository URL is required.', 'INVALID_URL');
  }
  if (trimmed.length > 2048) {
    throw new ValidationError('URL is too long (max 2048 characters).', 'INVALID_URL');
  }
  const match = GITHUB_URL_REGEX.exec(trimmed);
  if (!match) {
    throw new ValidationError(
      'Invalid GitHub URL. Expected format: https://github.com/owner/repo',
      'INVALID_URL'
    );
  }
  return { owner: match[1], repo: match[2] };
}

function errorStatus(code: ErrorCode): number {
  switch (code) {
    case 'INVALID_URL':
      return 400;
    case 'REPO_NOT_FOUND':
      return 404;
    case 'REPO_PRIVATE':
      return 403;
    case 'REPO_TOO_LARGE':
      return 413;
    case 'GITHUB_RATE_LIMITED':
      return 429;
    case 'GITHUB_UNAVAILABLE':
      return 502;
    case 'AI_ANALYSIS_FAILED':
    case 'GENERATION_FAILED':
      return 502;
    default:
      return 500;
  }
}

function errorResponse(
  code: ErrorCode,
  message: string,
  retryable = true,
  retryAfter?: string
): NextResponse<ErrorResponse> {
  return NextResponse.json<ErrorResponse>(
    {
      success: false,
      error: { code, message, retryable, retryAfter },
    },
    { status: errorStatus(code) }
  );
}

export async function POST(request: NextRequest) {
  let body: AnalyzeRequest;
  try {
    body = (await request.json()) as AnalyzeRequest;
  } catch {
    return errorResponse('INVALID_URL', 'Invalid JSON request body.', false);
  }

  let owner: string;
  let repo: string;
  try {
    ({ owner, repo } = parseGitHubUrl(body?.url ?? ''));
  } catch (error) {
    if (error instanceof ValidationError) {
      return errorResponse(error.code, error.message, false);
    }
    return errorResponse('INVALID_URL', 'Invalid URL.', false);
  }

  try {
    // 1. Validate repo accessibility
    const validation = await validateRepository(owner, repo);

    // 2. Resolve commit SHA
    const commitSha = await resolveCommitSHA(
      owner,
      repo,
      validation.defaultBranch
    );

    // 3. Fetch repository content
    const fetched = await fetchRepositoryContent(
      owner,
      repo,
      validation.defaultBranch,
      commitSha,
      validation.description,
      validation.primaryLanguage
    );

    // 4. AI analysis
    const analysis = await analyzeRepository(fetched.fileTree, fetched.files);

    // 5. Generate specs
    const spec = await generateSpecs(analysis, fetched.metadata, fetched.readme);

    const response: AnalyzeResponse = {
      success: true,
      metadata: fetched.metadata,
      spec,
      cached: false,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json<AnalyzeResponse>(response, { status: 200 });
  } catch (error) {
    console.error('[/api/analyze] error:', error);

    if (error instanceof GitHubError) {
      return errorResponse(error.code, error.message);
    }
    if (error instanceof AIAnalysisError) {
      return errorResponse(error.code, error.message);
    }
    if (error instanceof ValidationError) {
      return errorResponse(error.code, error.message, false);
    }

    return errorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred while analyzing the repository. Please try again.',
      true
    );
  }
}
