/**
 * Environment configuration and validation for SpecForge.
 *
 * Validates required environment variables at startup and provides
 * a typed configuration object for the application.
 */

export interface AppConfig {
  /** OpenRouter API key for AI model access */
  openRouterApiKey: string;
  /** OpenRouter model slug (e.g. "anthropic/claude-3.5-haiku"). Defaults to a low-cost model. */
  openRouterModel: string;
  /** GitHub personal access token for repository API access */
  githubToken: string;
  /** Optional S3 cache configuration */
  cache?: {
    awsAccessKeyId: string;
    awsSecretAccessKey: string;
    awsRegion: string;
    s3Bucket: string;
  };
}

/**
 * Validates that all required environment variables are present and returns
 * a typed configuration object. Throws a descriptive error if any required
 * variable is missing.
 */
export function getConfig(): AppConfig {
  const missing: string[] = [];

  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterApiKey) {
    missing.push("OPENROUTER_API_KEY");
  }

  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    missing.push("GITHUB_TOKEN");
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        `Please set them in your .env.local file. See .env.local.example for reference.`
    );
  }

  const config: AppConfig = {
    openRouterApiKey: openRouterApiKey!,
    openRouterModel:
      process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-haiku",
    githubToken: githubToken!,
  };

  // Optional S3 cache configuration — only included if all four vars are set
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.AWS_REGION;
  const s3Bucket = process.env.S3_CACHE_BUCKET;

  if (awsAccessKeyId && awsSecretAccessKey && awsRegion && s3Bucket) {
    config.cache = {
      awsAccessKeyId,
      awsSecretAccessKey,
      awsRegion,
      s3Bucket,
    };
  }

  return config;
}
