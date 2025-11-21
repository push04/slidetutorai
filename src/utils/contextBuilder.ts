import { chunkText, estimateTokenCount } from './textChunking';
import type { Upload } from '../services/FileProcessor';

export interface ContextSlice {
  uploadId: string;
  filename: string;
  slideCount: number;
  text: string;
  tokens: number;
}

export interface ContextBuildResult {
  context: string;
  totalTokens: number;
  slicesUsed: ContextSlice[];
}

const DEFAULT_MAX_TOKENS = 3200; // ~12.8k chars

/**
 * Build a stitched context from uploads while staying within a token budget.
 * Picks start/middle/end slices per upload to preserve coverage and avoids empty sources.
 */
export function buildContextFromUploads(
  uploads: Upload[],
  selectedUploadIds: string[],
  maxTokens: number = DEFAULT_MAX_TOKENS,
): ContextBuildResult {
  const selected = uploads.filter((u) => selectedUploadIds.includes(u.id) && u.fullText?.trim());
  if (selected.length === 0) {
    return { context: '', totalTokens: 0, slicesUsed: [] };
  }

  const slices: ContextSlice[] = [];
  let runningTokens = 0;

  for (const upload of selected) {
    const chunks = chunkText(upload.fullText || '', {
      maxChunkSize: 1400,
      overlapSize: 200,
      preserveParagraphs: true,
    });

    if (chunks.length === 0) continue;

    const importantSlices = chunks.length <= 3
      ? chunks
      : [chunks[0], chunks[Math.floor(chunks.length / 2)], chunks[chunks.length - 1]];

    for (const chunk of importantSlices) {
      const annotated = `Source: ${upload.filename} (${upload.slideCount} pages)\nPart ${chunk.index + 1}/${chunk.total}:\n${chunk.text}`;
      const tokens = estimateTokenCount(annotated);

      if (runningTokens + tokens > maxTokens) {
        continue;
      }

      slices.push({
        uploadId: upload.id,
        filename: upload.filename,
        slideCount: upload.slideCount,
        text: annotated,
        tokens,
      });
      runningTokens += tokens;
    }
  }

  const context = slices.map((s) => s.text).join('\n\n====\n\n');
  return { context, totalTokens: runningTokens, slicesUsed: slices };
}
