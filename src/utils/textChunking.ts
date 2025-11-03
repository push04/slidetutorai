/**
 * Smart text chunking utility for processing large content
 * Splits text into manageable chunks while preserving context
 */

export interface ChunkOptions {
  maxChunkSize?: number;
  overlapSize?: number;
  preserveParagraphs?: boolean;
  adaptiveChunking?: boolean; // Automatically adjust chunk size based on content complexity
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
    maxChunkSize = 3000, // Optimized for better AI processing quality and reduced hallucination
    overlapSize = 600,   // Larger overlap for maximum context preservation
    preserveParagraphs = true,
    adaptiveChunking = true,
  } = options;

  if (!text || text.trim().length === 0) {
    return [];
  }

  // If text is small enough, return as single chunk
  if (text.length <= maxChunkSize) {
    return [{ text, index: 0, total: 1 }];
  }

  // Adaptive chunking: analyze content density
  let effectiveChunkSize = maxChunkSize;
  if (adaptiveChunking) {
    const density = analyzeContentDensity(text);
    // For dense technical content, use smaller chunks
    if (density > 0.7) {
      effectiveChunkSize = Math.floor(maxChunkSize * 0.7);
    }
  }

  const chunks: TextChunk[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + effectiveChunkSize;

    // If this is not the last chunk, try to find a good break point
    if (endIndex < text.length && preserveParagraphs) {
      // Try to break at paragraph boundary (double newline)
      const paragraphBreak = text.lastIndexOf('\n\n', endIndex);
      if (paragraphBreak > startIndex + effectiveChunkSize * 0.5) {
        endIndex = paragraphBreak + 2;
      } else {
        // Try to break at single newline
        const lineBreak = text.lastIndexOf('\n', endIndex);
        if (lineBreak > startIndex + effectiveChunkSize * 0.5) {
          endIndex = lineBreak + 1;
        } else {
          // Try to break at sentence boundary
          const sentenceBreak = findSentenceBoundary(text, endIndex, startIndex);
          if (sentenceBreak > startIndex) {
            endIndex = sentenceBreak;
          } else {
            // Try to break at word boundary
            const wordBreak = text.lastIndexOf(' ', endIndex);
            if (wordBreak > startIndex + effectiveChunkSize * 0.5) {
              endIndex = wordBreak + 1;
            }
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
 * Find a good sentence boundary near the target index
 */
function findSentenceBoundary(text: string, targetIndex: number, minIndex: number): number {
  const sentenceEnders = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
  let bestMatch = -1;
  let bestDistance = Infinity;

  for (const ender of sentenceEnders) {
    const index = text.lastIndexOf(ender, targetIndex);
    if (index > minIndex) {
      const distance = Math.abs(targetIndex - index);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = index + ender.length;
      }
    }
  }

  return bestMatch;
}

/**
 * Analyze content density (ratio of technical terms, numbers, special chars)
 * Higher density = more technical/dense content
 */
function analyzeContentDensity(text: string): number {
  const sample = text.substring(0, Math.min(2000, text.length));
  const words = sample.split(/\s+/);
  const technicalIndicators = [
    /\d+/, // numbers
    /[A-Z]{2,}/, // acronyms
    /[_\-\.]{2,}/, // technical separators
    /\([^)]+\)/, // parenthetical expressions
    /\[[^\]]+\]/, // brackets
    /\{[^}]+\}/, // braces
    /```/, // code blocks
  ];

  let technicalCount = 0;
  for (const word of words) {
    if (technicalIndicators.some(pattern => pattern.test(word))) {
      technicalCount++;
    }
  }

  return words.length > 0 ? technicalCount / words.length : 0;
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
export function mergeChunkedResults(results: string[], type: 'lesson' | 'other' = 'lesson'): string {
  if (results.length === 0) return '';
  if (results.length === 1) return results[0];

  if (type === 'lesson') {
    // For lessons, merge with better deduplication
    const merged: string[] = [];
    const seenHeaders = new Set<string>();
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const lines = result.split('\n');
      const filteredLines: string[] = [];
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip duplicate headers
        if (trimmed.startsWith('#')) {
          if (seenHeaders.has(trimmed)) {
            continue;
          }
          seenHeaders.add(trimmed);
        }
        
        filteredLines.push(line);
      }
      
      merged.push(filteredLines.join('\n'));
    }
    
    return merged.join('\n\n---\n\n');
  }
  
  // For other types, simple concatenation
  return results.join('\n\n');
}
