import type { AIAnalysisResult, FetchedFile } from './types';
import { LIMITS } from './constants';
import { AIAnalysisError } from './errors';
import { getConfig } from './config';
import {
  ANALYSIS_SYSTEM_PROMPT,
  getAnalysisUserPrompt,
} from './prompts';

const OPENROUTER_CONFIG = {
  apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
  maxInputChars: 150_000,
  timeoutMs: LIMITS.AI_TIMEOUT,
  initialRetryDelayMs: 5_000,
  subsequentRetryDelayMs: 3_000,
  maxRetries: 3,
} as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assembleFileContents(fileContents: FetchedFile[], budgetChars: number): string {
  let payload = '';
  for (const file of fileContents) {
    const fileSection = `### ${file.path}\n\`\`\`\n${file.content}\n\`\`\`\n\n`;
    if (payload.length + fileSection.length > budgetChars) {
      break;
    }
    payload += fileSection;
  }
  return payload;
}

function validateAnalysisResponse(data: unknown): AIAnalysisResult {
  if (typeof data !== 'object' || data === null) {
    throw new AIAnalysisError('AI response is not a valid object', 'AI_ANALYSIS_FAILED');
  }

  const requiredSections = [
    'languages',
    'frameworks',
    'architecture',
    'features',
    'relationships',
    'entryPoints',
  ] as const;

  const obj = data as Record<string, unknown>;

  for (const section of requiredSections) {
    if (!Array.isArray(obj[section])) {
      throw new AIAnalysisError(
        `AI response missing required section: ${section}`,
        'AI_ANALYSIS_FAILED'
      );
    }
  }

  // Languages must be non-empty — every codebase has at least one language.
  // Other sections (frameworks, architecture, features, relationships, entryPoints)
  // may legitimately be empty for tiny or non-standard repos; downstream generators
  // handle empties gracefully.
  if ((obj.languages as unknown[]).length === 0) {
    throw new AIAnalysisError(
      'AI could not identify any language in the repository',
      'AI_ANALYSIS_FAILED'
    );
  }

  return data as AIAnalysisResult;
}

function stripFences(text: string): string {
  let s = text.trim();
  if (s.startsWith('```json')) s = s.slice(7);
  else if (s.startsWith('```')) s = s.slice(3);
  if (s.endsWith('```')) s = s.slice(0, -3);
  return s.trim();
}

async function callOpenRouterOnce(
  systemPrompt: string,
  userContent: string,
  maxTokens: number
): Promise<string> {
  const config = getConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENROUTER_CONFIG.timeoutMs);

  try {
    const response = await fetch(OPENROUTER_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://specforge.dev',
        'X-Title': 'SpecForge',
      },
      body: JSON.stringify({
        model: config.openRouterModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      throw new AIAnalysisError(
        `OpenRouter API returned status ${response.status}: ${errorBody.slice(0, 200)}`,
        'AI_ANALYSIS_FAILED'
      );
    }

    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new AIAnalysisError(
        'OpenRouter API returned an empty response',
        'AI_ANALYSIS_FAILED'
      );
    }
    return content;
  } catch (error: unknown) {
    if (error instanceof AIAnalysisError) throw error;

    if (error instanceof Error && error.name === 'AbortError') {
      throw new AIAnalysisError(
        `OpenRouter API call timed out after ${OPENROUTER_CONFIG.timeoutMs / 1000}s`,
        'AI_ANALYSIS_FAILED'
      );
    }

    throw new AIAnalysisError(
      `OpenRouter API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'AI_ANALYSIS_FAILED'
    );
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Calls OpenRouter with retry logic.
 * First retry after 5s, subsequent retries after 3s (per Req 4 + Req 12).
 * Total max attempts: 4 (1 initial + 3 retries).
 */
async function callOpenRouter(
  systemPrompt: string,
  userContent: string,
  maxTokens: number
): Promise<string> {
  let lastError: AIAnalysisError | null = null;

  for (let attempt = 0; attempt <= OPENROUTER_CONFIG.maxRetries; attempt++) {
    try {
      return await callOpenRouterOnce(systemPrompt, userContent, maxTokens);
    } catch (error) {
      lastError =
        error instanceof AIAnalysisError
          ? error
          : new AIAnalysisError('AI call failed', 'AI_ANALYSIS_FAILED');

      if (attempt < OPENROUTER_CONFIG.maxRetries) {
        const delay =
          attempt === 0
            ? OPENROUTER_CONFIG.initialRetryDelayMs
            : OPENROUTER_CONFIG.subsequentRetryDelayMs;
        await sleep(delay);
      }
    }
  }

  throw (
    lastError ||
    new AIAnalysisError('AI call failed after retries', 'AI_ANALYSIS_FAILED')
  );
}

export async function analyzeRepository(
  fileTree: string,
  fileContents: FetchedFile[]
): Promise<AIAnalysisResult> {
  // Reserve characters for prompt overhead and file tree
  const treeSection = `## File Tree\n\n${fileTree}\n\n## File Contents\n\n`;
  const remainingBudget = OPENROUTER_CONFIG.maxInputChars - treeSection.length - 1000;
  const filesPayload = assembleFileContents(
    fileContents,
    Math.max(remainingBudget, 1000)
  );

  const userContent = getAnalysisUserPrompt(fileTree, filesPayload).slice(
    0,
    OPENROUTER_CONFIG.maxInputChars
  );

  const responseContent = await callOpenRouter(
    ANALYSIS_SYSTEM_PROMPT,
    userContent,
    4096
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFences(responseContent));
  } catch {
    throw new AIAnalysisError('AI response is not valid JSON', 'AI_ANALYSIS_FAILED');
  }

  return validateAnalysisResponse(parsed);
}

/**
 * Generic helper used by spec-generator for markdown content generation.
 */
export async function generateContent(
  systemPrompt: string,
  userContent: string,
  maxTokens: number
): Promise<string> {
  return callOpenRouter(systemPrompt, userContent, maxTokens);
}

/**
 * Helper for AI calls that should return JSON. Strips markdown fences before parsing.
 */
export async function generateJSON<T = unknown>(
  systemPrompt: string,
  userContent: string,
  maxTokens: number
): Promise<T> {
  const raw = await callOpenRouter(systemPrompt, userContent, maxTokens);
  try {
    return JSON.parse(stripFences(raw)) as T;
  } catch {
    throw new AIAnalysisError(
      'AI response is not valid JSON',
      'GENERATION_FAILED'
    );
  }
}
