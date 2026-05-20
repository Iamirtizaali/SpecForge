import type {
  AIAnalysisResult,
  GeneratedFile,
  GeneratedSpec,
  ProgressPhase,
  RepoMetadata,
} from './types';
import { generateContent, generateJSON } from './openrouter';
import {
  REQUIREMENTS_SYSTEM_PROMPT,
  getRequirementsUserPrompt,
  DESIGN_SYSTEM_PROMPT,
  getDesignUserPrompt,
  TASKS_SYSTEM_PROMPT,
  getTasksUserPrompt,
  STEERING_SYSTEM_PROMPT,
  getSteeringUserPrompt,
  HOOKS_SYSTEM_PROMPT,
  getHooksUserPrompt,
} from './prompts';

interface SteeringResult {
  product: string;
  tech: string;
  structure: string;
}

interface HookSuggestion {
  name: string;
  eventType: string;
  action: string;
  description: string;
}

const SPEC_SLUG = 'repo-analysis';

export async function generateRequirements(
  analysis: AIAnalysisResult,
  metadata: RepoMetadata
): Promise<string> {
  return generateContent(
    REQUIREMENTS_SYSTEM_PROMPT,
    getRequirementsUserPrompt(analysis, metadata.repo, metadata.description),
    8192
  );
}

export async function generateDesign(
  analysis: AIAnalysisResult,
  metadata: RepoMetadata
): Promise<string> {
  return generateContent(
    DESIGN_SYSTEM_PROMPT,
    getDesignUserPrompt(analysis, metadata.repo),
    6144
  );
}

export async function generateTasks(
  analysis: AIAnalysisResult,
  metadata: RepoMetadata
): Promise<string> {
  return generateContent(
    TASKS_SYSTEM_PROMPT,
    getTasksUserPrompt(analysis, metadata.repo),
    4096
  );
}

export async function generateSteering(
  analysis: AIAnalysisResult,
  metadata: RepoMetadata,
  readme: string
): Promise<SteeringResult> {
  const result = await generateJSON<SteeringResult>(
    STEERING_SYSTEM_PROMPT,
    getSteeringUserPrompt(analysis, readme, metadata.repo),
    6144
  );

  return {
    product: result.product || '# Product Context\n\n_Generation incomplete._',
    tech: result.tech || '# Technical Context\n\n_Generation incomplete._',
    structure: result.structure || '# Project Structure\n\n_Generation incomplete._',
  };
}

export async function generateHooks(
  analysis: AIAnalysisResult
): Promise<HookSuggestion[]> {
  const result = await generateJSON<HookSuggestion[]>(
    HOOKS_SYSTEM_PROMPT,
    getHooksUserPrompt(analysis),
    2048
  );

  if (!Array.isArray(result) || result.length === 0) {
    return defaultHooks();
  }

  return result
    .filter(
      (h) =>
        h && typeof h.name === 'string' && typeof h.eventType === 'string' &&
        typeof h.action === 'string' && typeof h.description === 'string'
    )
    .slice(0, 3)
    .map((h) => ({
      name: h.name.slice(0, 50),
      eventType: h.eventType.slice(0, 50),
      action: h.action.slice(0, 200),
      description: h.description.slice(0, 300),
    }));
}

function defaultHooks(): HookSuggestion[] {
  return [
    {
      name: 'format-on-save',
      eventType: 'file.save',
      action: 'Run the project formatter on the saved file',
      description:
        'Automatically format files on save to keep the codebase consistent across contributors.',
    },
    {
      name: 'commit-message-check',
      eventType: 'pre-commit',
      action: 'Validate commit messages follow the conventional commit format',
      description:
        'Reject commits whose messages do not follow the configured conventional commit style.',
    },
  ];
}

function slugifyHookName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'hook'
  );
}

function hookFileContent(hook: HookSuggestion): string {
  return [
    `# ${hook.name}`,
    '',
    `**Event:** \`${hook.eventType}\``,
    '',
    '## Action',
    '',
    hook.action,
    '',
    '## Description',
    '',
    hook.description,
    '',
  ].join('\n');
}

/**
 * Orchestrates spec generation. Calls each generator sequentially and reports
 * progress through the optional callback.
 */
export async function generateSpecs(
  analysis: AIAnalysisResult,
  metadata: RepoMetadata,
  readme: string,
  onProgress?: (phase: ProgressPhase) => void
): Promise<GeneratedSpec> {
  onProgress?.('generating');

  const [requirementsMd, designMd, tasksMd, steering, hooks] = await Promise.all([
    generateRequirements(analysis, metadata),
    generateDesign(analysis, metadata),
    generateTasks(analysis, metadata),
    generateSteering(analysis, metadata, readme),
    generateHooks(analysis),
  ]);

  const files: GeneratedFile[] = [
    {
      path: `.kiro/specs/${SPEC_SLUG}/requirements.md`,
      content: requirementsMd,
      type: 'requirements',
    },
    {
      path: `.kiro/specs/${SPEC_SLUG}/design.md`,
      content: designMd,
      type: 'design',
    },
    {
      path: `.kiro/specs/${SPEC_SLUG}/tasks.md`,
      content: tasksMd,
      type: 'tasks',
    },
    {
      path: '.kiro/steering/product.md',
      content: steering.product,
      type: 'steering',
    },
    {
      path: '.kiro/steering/tech.md',
      content: steering.tech,
      type: 'steering',
    },
    {
      path: '.kiro/steering/structure.md',
      content: steering.structure,
      type: 'steering',
    },
    ...hooks.map<GeneratedFile>((hook) => ({
      path: `.kiro/hooks/${slugifyHookName(hook.name)}.md`,
      content: hookFileContent(hook),
      type: 'hook',
    })),
  ];

  onProgress?.('complete');
  return { files };
}
