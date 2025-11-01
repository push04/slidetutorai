/**
 * Smart text chunking utility for processing large content
 * Splits text into manageable chunks while preserving context
 */

export interface ChunkOptions {
  maxChunkSize?: number;
  overlapSize?: number;
  preserveParagraphs?: boolean;
}

export interface TextChunk {
  text: string;
  index: number;
  total: number;
}

/**
 * Split text into chunks with overlap to preserve context
 * @param text - The text to split
 * @param options - Chunking options
 * @returns Array of text chunks with metadata
 */
export function chunkText(
  text: string,
  options: ChunkOptions = {}
): TextChunk[] {
  const {
    maxChunkSize = 4000, // Conservative limit for token estimation (~1000 tokens)
    overlapSize = 200,   // Overlap to maintain context
    preserveParagraphs = true,
  } = options;

  if (!text || text.trim().length === 0) {
    return [];
  }

  // If text is small enough, return as single chunk
  if (text.length <= maxChunkSize) {
    return [{ text, index: 0, total: 1 }];
  }

  const chunks: TextChunk[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + maxChunkSize;

    // If this is not the last chunk, try to find a good break point
    if (endIndex < text.length && preserveParagraphs) {
      // Try to break at paragraph boundary
      const paragraphBreak = text.lastIndexOf('\n\n', endIndex);
      if (paragraphBreak > startIndex) {
        endIndex = paragraphBreak + 2;
      } else {
        // Try to break at sentence boundary
        const sentenceBreak = text.lastIndexOf('. ', endIndex);
        if (sentenceBreak > startIndex) {
          endIndex = sentenceBreak + 2;
        } else {
          // Try to break at word boundary
          const wordBreak = text.lastIndexOf(' ', endIndex);
          if (wordBreak > startIndex) {
            endIndex = wordBreak + 1;
          }
        }
      }
    }

    const chunk = text.substring(startIndex, endIndex).trim();
    if (chunk.length > 0) {
      chunks.push({
        text: chunk,
        index: chunks.length,
        total: 0, // Will be updated after all chunks are created
      });
    }

    // Move to next chunk with overlap
    startIndex = endIndex - overlapSize;
    if (startIndex >= text.length) break;
  }

  // Update total count in all chunks
  const totalChunks = chunks.length;
  chunks.forEach(chunk => chunk.total = totalChunks);

  return chunks;
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Merge chunked results intelligently
 * Removes duplicate content from overlap regions
 */
export function mergeChunkedResults(results: string[]): string {
  if (results.length === 0) return '';
  if (results.length === 1) return results[0];

  // For lesson-type content, concatenate with section breaks
  return results
    .map((result, index) => {
      if (index === 0) return result;
      
      // Remove duplicate headers if present
      const lines = result.split('\n');
      const firstNonEmptyLine = lines.findIndex(line => line.trim().length > 0);
      
      // If the first line is a duplicate header, skip it
      if (firstNonEmptyLine >= 0 && lines[firstNonEmptyLine].startsWith('#')) {
        return lines.slice(firstNonEmptyLine + 1).join('\n');
      }
      
      return result;
    })
    .join('\n\n---\n\n');
}
