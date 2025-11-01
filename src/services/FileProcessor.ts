import { v4 as uuidv4 } from 'uuid';

// --- FIX: DECLARE GLOBAL VARIABLES ---
// This tells TypeScript to trust that these variables exist in the global scope
// (provided by the script tags in index.html).
declare const pdfjsLib: any;
declare const JSZip: any;

// Required for pdf.js to work in a Vite/web environment
// Use the global variable `pdfjsLib` instead of the imported `pdfjs`
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js`;

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
  const arrayBuffer = await file.arrayBuffer();
  // FIX: Use the global `pdfjsLib` variable
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  let fullText = '';

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => ('str' in item ? item.str : '')).join(' ');
    fullText += `Slide ${i}:\n${pageText}\n\n`;
  }

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
  private processingStrategies: Record<string, (file: File) => Promise<{ fullText: string; slideCount: number }>> = {
    'application/pdf': parsePdf,
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': parsePptx,
  };

  public async processFile(file: File): Promise<Upload> {
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
      let strategy = this.processingStrategies[file.type];
      
      if (!strategy) {
        if (file.name.endsWith('.pptx')) {
            strategy = this.processingStrategies['application/vnd.openxmlformats-officedocument.presentationml.presentation'];
        } else {
            throw new Error(`Unsupported file type: ${file.type || file.name.split('.').pop()}`);
        }
      }

      const { fullText, slideCount } = await strategy(file);

      upload.fullText = fullText;
      upload.slideCount = slideCount;
      upload.processed = true;
      upload.indexed = true;
      upload.status = 'completed';
      
    } catch (error) {
      console.error(`Failed to process file ${file.name}:`, error);
      upload.status = 'failed';
      upload.errorMessage = error instanceof Error ? error.message : 'An unknown processing error occurred.';
    }

    return upload;
  }
}

export const processor = new FileProcessor();
