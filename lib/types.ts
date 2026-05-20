// --- Request/Response Types ---

export interface AnalyzeRequest {
  url: string;
}

export interface AnalyzeResponse {
  success: true;
  metadata: RepoMetadata;
  spec: GeneratedSpec;
  cached: boolean;
  generatedAt: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    retryable: boolean;
    retryAfter?: string;
  };
}

export type ErrorCode =
  | 'INVALID_URL'
  | 'REPO_NOT_FOUND'
  | 'REPO_PRIVATE'
  | 'REPO_TOO_LARGE'
  | 'GITHUB_UNAVAILABLE'
  | 'GITHUB_RATE_LIMITED'
  | 'AI_ANALYSIS_FAILED'
  | 'GENERATION_FAILED'
  | 'INTERNAL_ERROR';

// --- Domain Types ---

export interface RepoMetadata {
  owner: string;
  repo: string;
  defaultBranch: string;
  commitSha: string;
  description?: string;
  fileCount: number;
  primaryLanguage?: string;
}

export interface GeneratedSpec {
  files: GeneratedFile[];
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: FileType;
}

export type FileType = 'requirements' | 'design' | 'tasks' | 'steering' | 'hook';

// --- AI Analysis Types ---

export interface AIAnalysisResult {
  languages: LanguageEntry[];
  frameworks: FrameworkEntry[];
  architecture: ArchitecturePattern[];
  features: FeatureEntry[];
  relationships: ComponentRelationship[];
  entryPoints: EntryPoint[];
}

export interface LanguageEntry {
  name: string;
  percentage: number;
}

export interface FrameworkEntry {
  name: string;
  role: string;
}

export interface ArchitecturePattern {
  pattern: string;
  evidence: string;
}

export interface FeatureEntry {
  name: string;
  description: string;
  components: string[];
}

export interface ComponentRelationship {
  source: string;
  target: string;
  type: 'calls' | 'reads_from' | 'writes_to' | 'subscribes_to' | 'depends_on';
}

export interface EntryPoint {
  file: string;
  purpose: string;
}

// --- Progress Types ---

export type ProgressPhase =
  | 'validating'
  | 'fetching'
  | 'analyzing'
  | 'generating'
  | 'complete';

export interface ProgressEvent {
  phase: ProgressPhase;
  timestamp: string;
  message?: string;
}

// --- Fetched File Type ---

export interface FetchedFile {
  path: string;
  content: string;
  size: number;
  truncated: boolean;
}
