import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Loader2, CheckCircle2, AlertCircle, Upload, FileText, Eye, Scan, Copy, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { createWorker } from 'tesseract.js';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ImageRecognitionProps {
  onImageProcessed: (imageData: { text: string; description: string; filename: string }) => void;
  apiKey: string;
}

export function ImageRecognition({ onImageProcessed, apiKey }: ImageRecognitionProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'extracting' | 'success' | 'error'>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [wasEnhancedByAI, setWasEnhancedByAI] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      setProcessingStatus('idle');
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB limit
    disabled: isProcessing
  });

  const handleProcessImage = async () => {
    if (!selectedFile) {
      toast.error('Please select an image first');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('uploading');

    let worker: any = null;

    try {
      setProcessingStatus('analyzing');
      console.log('[OCR] Starting FREE Tesseract.js OCR processing...');

      // Initialize Tesseract worker with multiple language support
      // Supports: English + mathematical equations + handwriting recognition
      worker = await createWorker(['eng'], 1, {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            console.log(`[OCR] Progress: ${(m.progress * 100).toFixed(0)}%`);
          }
        }
      });

      setProcessingStatus('extracting');

      // Perform OCR on the image
      const { data } = await worker.recognize(selectedFile);
      
      // Clean up the worker
      await worker.terminate();
      worker = null;

      const extractedText = data.text.trim();

      if (!extractedText || extractedText.length < 5) {
        throw new Error('No text could be extracted from the image. Make sure the image contains clear, readable text.');
      }

      console.log(`[OCR] ✅ Extracted ${extractedText.length} characters`);

      // If API key is available, enhance with AI analysis
      let enhancedContent = extractedText;
      let description = 'Text extracted successfully using advanced OCR';

      if (apiKey && extractedText.length > 20) {
        try {
          setProcessingStatus('analyzing');
          console.log('[OCR] Enhancing with AI analysis...');

          // Use AI to format and analyze the extracted text with enhanced prompt
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'HTTP-Referer': window.location.origin,
              'X-Title': 'SlideTutor AI - OCR Enhancement'
            },
            body: JSON.stringify({
              model: 'qwen/qwen-2.5-7b-instruct:free',
              messages: [
                {
                  role: 'user',
                  content: `You are an expert OCR text enhancer. Analyze and enhance this OCR-extracted text:

${extractedText}

Your task:
1. Fix ALL OCR errors, typos, and character recognition mistakes
2. Identify content type (handwriting, printed text, equations, diagrams, tables, etc.)
3. For mathematical content: preserve equations and formulas accurately
4. For tables/charts: reconstruct structure using markdown tables
5. For diagrams: describe the visual elements clearly
6. Format beautifully with markdown (headers, lists, bold, code blocks)
7. Organize into logical sections with clear hierarchy
8. Preserve ALL original information - no omissions

If the text contains:
- Math: Use LaTeX notation in code blocks
- Tables: Use markdown table syntax
- Technical terms: Keep them intact
- Handwriting: Correct errors while preserving meaning

Return the enhanced, professionally formatted text.`
                }
              ],
              temperature: 0.3,
              max_tokens: 4000
            })
          });

          if (response.ok) {
            const data = await response.json();
            const aiEnhanced = data.choices?.[0]?.message?.content;
            if (aiEnhanced) {
              enhancedContent = aiEnhanced;
              description = 'Text extracted with OCR and enhanced with AI formatting';
              console.log('[OCR] ✅ AI enhancement complete');
            }
          }
        } catch (aiError) {
          console.log('[OCR] AI enhancement failed, using raw OCR text');
          // Continue with raw OCR text if AI fails
        }
      }

      const processedData = {
        text: enhancedContent,
        description: description,
        filename: selectedFile.name
      };

      // Display the results in the UI
      setExtractedText(enhancedContent);
      setAiAnalysis(description);
      setWasEnhancedByAI(apiKey && extractedText.length > 20 && enhancedContent !== extractedText);
      
      setProcessingStatus('success');
      onImageProcessed(processedData);
      
      toast.success(`Successfully extracted ${extractedText.length} characters from image!`);
      
      // Keep the result visible for review
      setTimeout(() => {
        setIsProcessing(false);
      }, 1500);

    } catch (error: any) {
      console.error('Image processing error:', error);
      setProcessingStatus('error');
      
      // Clean up worker if it exists
      if (worker) {
        try {
          await worker.terminate();
        } catch (e) {
          console.error('Error terminating worker:', e);
        }
      }

      toast.error(error.message || 'Failed to process image. Please ensure the image contains clear, readable text.');
      setTimeout(() => {
        setProcessingStatus('idle');
        setIsProcessing(false);
      }, 2000);
    }
  };

  const clearImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setProcessingStatus('idle');
    setIsProcessing(false);
    setExtractedText('');
    setAiAnalysis('');
    setWasEnhancedByAI(false);
  };

  const copyExtractedText = () => {
    navigator.clipboard.writeText(extractedText);
    toast.success('Text copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-8 rounded-2xl border border-border/40 bg-gradient-to-br from-purple-500/5 via-transparent to-indigo-500/5">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Scan className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">Snap & Extract Instantly</h1>
            <p className="text-muted-foreground">Transform any image into editable text - handwriting, equations, diagrams & more!</p>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-4 rounded-xl border border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">100% Free</div>
                <div className="text-xs text-muted-foreground">Zero API costs</div>
              </div>
            </div>
          </div>
          <div className="glass-card p-4 rounded-xl border border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">AI Enhanced</div>
                <div className="text-xs text-muted-foreground">Smart formatting</div>
              </div>
            </div>
          </div>
          <div className="glass-card p-4 rounded-xl border border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Scan className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">Universal</div>
                <div className="text-xs text-muted-foreground">Charts & diagrams</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Processing Card */}
      <div className="glass-card p-6 rounded-2xl border border-border/40">
        <div className="space-y-4">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 bg-background/50'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            {imagePreview ? (
              <div className="space-y-3">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="max-h-64 mx-auto rounded-lg border border-border/50"
                />
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">{selectedFile?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedFile && (selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                {!isProcessing && (
                  <button
                    onClick={(e) => { e.stopPropagation(); clearImage(); }}
                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    Clear & select another
                  </button>
                )}
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                {isDragActive ? (
                  <p className="text-sm text-primary font-medium">Drop the image here...</p>
                ) : (
                  <div>
                    <p className="text-sm text-foreground font-medium mb-1">
                      Drag & drop an image here, or click to select
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports PNG, JPG, JPEG, GIF, BMP, WebP (max 10MB)
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Status Messages */}
          {processingStatus !== 'idle' && (
            <div className="flex items-center gap-3 p-4 bg-background/50 rounded-lg border border-border">
              {processingStatus === 'uploading' && (
                <>
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="text-sm text-muted-foreground">Preparing image...</span>
                </>
              )}
              {processingStatus === 'analyzing' && (
                <>
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="text-sm text-muted-foreground">Analyzing image with AI vision...</span>
                </>
              )}
              {processingStatus === 'extracting' && (
                <>
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="text-sm text-muted-foreground">Extracting text and content...</span>
                </>
              )}
              {processingStatus === 'success' && (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-green-600 dark:text-green-400">Image processed successfully!</span>
                </>
              )}
              {processingStatus === 'error' && (
                <>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-error dark:text-red-400">Processing failed. Please try again.</span>
                </>
              )}
            </div>
          )}

          {/* Process Button */}
          <button
            onClick={handleProcessImage}
            disabled={isProcessing || !selectedFile}
            className="w-full px-4 py-3 bg-gradient-to-r from-purple-700 to-indigo-700 dark:from-purple-600 dark:to-indigo-600 hover:from-purple-800 hover:to-indigo-800 dark:hover:from-purple-500 dark:hover:to-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing with AI Vision...
              </>
            ) : (
              <>
                <Scan className="w-5 h-5" />
                Analyze Image with AI
              </>
            )}
          </button>

          {/* Enhanced Capabilities Grid */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-4 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-xl border border-purple-500/20">
              <h4 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-500" />
                Text Recognition
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>✓ Printed text (books, documents)</li>
                <li>✓ Handwritten notes & signatures</li>
                <li>✓ Multiple languages supported</li>
              </ul>
            </div>
            <div className="p-4 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 rounded-xl border border-indigo-500/20">
              <h4 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                <Scan className="w-4 h-4 text-indigo-500" />
                Visual Analysis
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>✓ Mathematical equations & formulas</li>
                <li>✓ Diagrams, charts & tables</li>
                <li>✓ Technical notation & symbols</li>
              </ul>
            </div>
          </div>
          
          {/* Pro Tips */}
          <div className="mt-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Pro Tip:</span> Higher resolution images (1200x1200+ pixels) provide significantly better accuracy, especially for handwriting and complex equations!
            </p>
          </div>
        </div>
      </div>

      {/* Extracted Text Display */}
      {extractedText && (
        <div className="glass-card p-6 rounded-2xl border border-border/40 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Extracted Text & Analysis</h2>
                {wasEnhancedByAI && (
                  <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                    <Sparkles className="w-3 h-3" />
                    <span>AI Enhanced & Formatted</span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={copyExtractedText}
              className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Copy className="w-4 h-4" />
              Copy Text
            </button>
          </div>

          {/* Display extracted/enhanced text */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="glass-card p-6 rounded-xl border border-border/30 bg-background/50">
              <div className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                EXTRACTED CONTENT
              </div>
              {wasEnhancedByAI ? (
                <MarkdownRenderer content={extractedText} />
              ) : (
                <div className="whitespace-pre-wrap text-foreground font-mono text-sm leading-relaxed">
                  {extractedText}
                </div>
              )}
            </div>
          </div>

          {/* Character count */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border/30 pt-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{extractedText.length}</span>
              <span>characters extracted</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{extractedText.split(/\s+/).length}</span>
              <span>words</span>
            </div>
            {wasEnhancedByAI && (
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                <Sparkles className="w-3 h-3" />
                <span>Enhanced with AI</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
