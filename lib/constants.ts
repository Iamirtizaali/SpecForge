export const LIMITS = {
  /** Maximum number of text files to fetch from a repository */
  MAX_FILES: 20,
  /** Maximum total cumulative content size in bytes (100KB) */
  MAX_TOTAL_SIZE: 102_400,
  /** Maximum size per individual file in bytes (50KB) */
  MAX_FILE_SIZE: 51_200,
  /** Maximum number of files in the repository tree before rejecting */
  MAX_FILE_TREE: 10_000,
  /** Overall analysis timeout in milliseconds (90s) */
  ANALYSIS_TIMEOUT: 90_000,
  /** AI API call timeout in milliseconds (120s) */
  AI_TIMEOUT: 120_000,
} as const;
