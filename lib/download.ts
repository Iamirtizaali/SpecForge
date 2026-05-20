import JSZip from 'jszip';
import type { GeneratedFile } from './types';

/**
 * Sanitizes a repository name into a safe filename component.
 * Replaces invalid characters with hyphens, collapses repeats, truncates to 100 chars.
 */
export function sanitizeRepoName(name: string): string {
  const sanitized = name
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
  return sanitized || 'repo';
}

export function buildZipFilename(repoName: string): string {
  // Reserve room for the suffix so total length stays <= 100
  const SUFFIX = '-kiro-specs.zip';
  const maxNameLen = 100 - SUFFIX.length;
  const safe = sanitizeRepoName(repoName).slice(0, maxNameLen);
  return `${safe}${SUFFIX}`;
}

/**
 * Builds a Blob containing a ZIP archive of all generated files,
 * preserving their .kiro/* paths.
 */
export async function buildSpecZip(files: GeneratedFile[]): Promise<Blob> {
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.path, file.content);
  }
  return zip.generateAsync({ type: 'blob' });
}

/**
 * Triggers a browser download of the given Blob with the given filename.
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Release memory after the click
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function downloadSpecsAsZip(
  files: GeneratedFile[],
  repoName: string
): Promise<void> {
  const blob = await buildSpecZip(files);
  triggerDownload(blob, buildZipFilename(repoName));
}
