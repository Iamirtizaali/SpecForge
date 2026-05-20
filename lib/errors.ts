import type { ErrorCode } from './types';

export class ValidationError extends Error {
  readonly code: ErrorCode;

  constructor(message: string, code: ErrorCode = 'INVALID_URL') {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
  }
}

export class GitHubError extends Error {
  readonly code: ErrorCode;

  constructor(message: string, code: ErrorCode = 'GITHUB_UNAVAILABLE') {
    super(message);
    this.name = 'GitHubError';
    this.code = code;
  }
}

export class AIAnalysisError extends Error {
  readonly code: ErrorCode;

  constructor(message: string, code: ErrorCode = 'AI_ANALYSIS_FAILED') {
    super(message);
    this.name = 'AIAnalysisError';
    this.code = code;
  }
}

export class CacheError extends Error {
  readonly code: ErrorCode;

  constructor(message: string, code: ErrorCode = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'CacheError';
    this.code = code;
  }
}
