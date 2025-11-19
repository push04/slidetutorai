import { v4 as uuidv4 } from 'uuid';
import { largeFileProcessor } from '../lib/largeFileProcessor';
import { persistentStorage } from '../lib/persistentStorage';

// --- FIX: DECLARE GLOBAL VARIABLES ---
// This tells TypeScript to trust that these variables exist in the global scope
// (provided by the script tags in index.html).
declare const pdfjsLib: any;
declare const JSZip: any;

// Required for pdf.js to work in a Vite/web environment
// Use the global variable `pdfjsLib` instead of the imported `pdfjs`
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js`;

// Threshold for using large file processor (50MB)
const LARGE_FILE_SIZE_THRESHOLD = 50 * 1024 * 1024; // 50MB

// ================================================================================================
// 1. TYPE DEFINITIONS
// ================================================================================================

export type UploadStatus = 'processing' | 'completed' | 'failed';

export interface Upload {
  id: string;
  filename: string;
  size: number;
  uploadedAt: string;
  processed: boolean;
  indexed: boolean;
  slideCount: number;
  fullText: string;
  status: UploadStatus;
  errorMessage?: string;
}

// ================================================================================================
// 2. FILE-SPECIFIC PARSERS (Real Implementation)
// ================================================================================================

/**
 * Parses a PDF file to extract its text content.
 * @param file The PDF file to parse.
 * @returns The extracted text and page/slide count.
 */
async function parsePdf(file: File): Promise<{ fullText: string; slideCount: number }> {
  console.log(`[PDF Parser] Starting PDF parsing for ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ 
    data: arrayBuffer,
    verbosity: 0,
    disableFontFace: true,
    isEvalSupported: false,
  }).promise;
  
  const numPages = pdf.numPages;
  console.log(`[PDF Parser] Processing ${numPages} pages...`);
  let fullText = '';
  const textChunks: string[] = [];

  const BATCH_SIZE = 25;
  for (let batch = 0; batch < Math.ceil(numPages / BATCH_SIZE); batch++) {
    const start = batch * BATCH_SIZE + 1;
    const end = Math.min((batch + 1) * BATCH_SIZE, numPages);
    console.log(`[PDF Parser] Processing pages ${start}-${end}...`);

    for (let i = start; i <= end; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => ('str' in item ? item.str : ''))
          .join(' ');
        textChunks.push(`Slide ${i}:\n${pageText}\n\n`);
        
        page.cleanup();
      } catch (error) {
        console.error(`[PDF Parser] Error on page ${i}:`, error);
        textChunks.push(`Slide ${i}:\n[Error reading page]\n\n`);
      }
    }

    if (batch < Math.ceil(numPages / BATCH_SIZE) - 1) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  fullText = textChunks.join('');
  
  pdf.cleanup();
  pdf.destroy();
  
  console.log(`[PDF Parser] Completed! Extracted ${fullText.length} characters from ${numPages} pages`);
  return { fullText: fullText.trim(), slideCount: numPages };
}

/**
 * Parses a PPTX file by unzipping it and extracting text from the slide XML files.
 * @param file The PPTX file to parse.
 * @returns The extracted text and slide count.
 */
async function parsePptx(file: File): Promise<{ fullText: string; slideCount: number }> {
  // FIX: Use the global `JSZip` variable
  const zip = await JSZip.loadAsync(file);
  const slideFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide'));
  let fullText = '';
  
  slideFiles.sort((a, b) => {
      const numA = parseInt(a.match(/(\d+)\.xml$/)?.[1] || '0');
      const numB = parseInt(b.match(/(\d+)\.xml$/)?.[1] || '0');
      return numA - numB;
  });

  for (let i = 0; i < slideFiles.length; i++) {
    const slideXmlString = await zip.file(slideFiles[i])?.async('string');
    if (slideXmlString) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(slideXmlString, 'application/xml');
      const textNodes = xmlDoc.getElementsByTagName('a:t');
      const slideText = Array.from(textNodes).map(node => node.textContent).join(' ');
      fullText += `Slide ${i + 1}:\n${slideText}\n\n`;
    }
  }

  return { fullText: fullText.trim(), slideCount: slideFiles.length };
}


// ================================================================================================
// 3. CORE FILE PROCESSOR
// ================================================================================================

class FileProcessor {
  private processingStrategies: Record<string, (file: File, signal?: AbortSignal) => Promise<{ fullText: string; slideCount: number }>> = {
    'application/pdf': (file, signal) => {
      if (signal?.aborted) {
        throw new DOMException('Processing aborted', 'AbortError');
      }
      return parsePdf(file);
    },
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': (file, signal) => {
      if (signal?.aborted) {
        throw new DOMException('Processing aborted', 'AbortError');
      }
      return parsePptx(file);
    },
  };

  public async processFile(
    file: File,
    options: {
      onProgress?: (progress: number, message: string, estimatedTimeRemaining?: number) => void;
      signal?: AbortSignal;
    } = {}
  ): Promise<Upload> {
    const { onProgress, signal } = options;
    let lastProgress = 0;
    const emitProgress = (progress: number, message: string, etaSeconds?: number) => {
      lastProgress = Math.min(99, Math.max(lastProgress, progress));
      onProgress?.(lastProgress, message, etaSeconds);
    };
    const throwIfAborted = () => {
      if (signal?.aborted) {
        throw new DOMException('Processing aborted', 'AbortError');
      }
    };

    throwIfAborted();
    // Check if this is a large file that needs special handling
    const isLargeFile = file.size > LARGE_FILE_SIZE_THRESHOLD;
    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    
    if (isPDF && isLargeFile) {
      console.log(`[FileProcessor] Large PDF detected (${(file.size / 1024 / 1024).toFixed(2)}MB), using advanced processor...`);

      try {
        const storedUpload = await largeFileProcessor.processLargePDF(file, {
          onProgress,
          signal,
          saveCheckpoints: true,
        });
        
        // Convert StoredUpload to Upload format
        return {
          id: storedUpload.id,
          filename: storedUpload.filename,
          size: storedUpload.size,
          uploadedAt: storedUpload.uploadedAt,
          processed: storedUpload.processed,
          indexed: storedUpload.indexed,
          slideCount: storedUpload.slideCount,
          fullText: storedUpload.fullText,
          status: storedUpload.status as 'processing' | 'completed' | 'failed',
        };
      } catch (error) {
        console.error(`[FileProcessor] Large file processing failed:`, error);
        throw error;
      }
    }

    // Standard processing for smaller files
    const upload: Upload = {
      id: uuidv4(),
      filename: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      processed: false,
      indexed: false,
      slideCount: 0,
      fullText: '',
      status: 'processing',
    };

    try {
      throwIfAborted();
      emitProgress(5, 'Starting file processing...');
      
      let strategy = this.processingStrategies[file.type];
      
      if (!strategy) {
        if (file.name.endsWith('.pptx')) {
            strategy = this.processingStrategies['application/vnd.openxmlformats-officedocument.presentationml.presentation'];
        } else {
            throw new Error(`Unsupported file type: ${file.type || file.name.split('.').pop()}`);
        }
      }

      throwIfAborted();
      emitProgress(18, 'Extracting text...');
      const { fullText, slideCount } = await strategy(file, signal);

      throwIfAborted();
      upload.fullText = fullText;
      upload.slideCount = slideCount;
      upload.processed = true;
      upload.indexed = true;
      upload.status = 'completed';

      // Save to persistent storage
      await persistentStorage.saveUpload({
        ...upload,
        processingProgress: 100,
      });

      throwIfAborted();
      emitProgress(100, 'Complete!', 0);

    } catch (error) {
      console.error(`Failed to process file ${file.name}:`, error);
      upload.status = 'failed';
      upload.errorMessage = error instanceof Error ? error.message : 'An unknown processing error occurred.';
    }

    return upload;
  }
}

export const processor = new FileProcessor();
