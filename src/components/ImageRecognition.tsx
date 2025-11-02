import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Loader2, CheckCircle2, AlertCircle, Upload, FileText, Eye, Scan } from 'lucide-react';
import toast from 'react-hot-toast';

interface ImageRecognitionProps {
  onImageProcessed: (imageData: { text: string; description: string; filename: string }) => void;
  apiKey: string;
}

export function ImageRecognition({ onImageProcessed, apiKey }: ImageRecognitionProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'extracting' | 'success' | 'error'>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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

    if (!apiKey) {
      toast.error('Please configure your OpenRouter API key in Settings first');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('uploading');

    try {
      // Convert image to base64
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      setProcessingStatus('analyzing');

      // Call OpenRouter Vision API for OCR and analysis
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'SlideTutor AI - Image Recognition'
        },
        body: JSON.stringify({
          model: 'qwen/qwen2.5-vl-32b-instruct:free', // Free vision model optimized for OCR
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `You are an advanced OCR and image analysis AI. Please analyze this image thoroughly and provide:

1. **EXTRACTED TEXT** - Extract ALL visible text using OCR, including:
   - Printed text
   - Handwritten text
   - Text in diagrams, charts, and tables
   - Mathematical equations and formulas
   - Labels and annotations

2. **VISUAL ANALYSIS** - Describe:
   - Diagrams, charts, graphs, and their data
   - Visual relationships and structure
   - Key visual elements and their meaning

3. **EDUCATIONAL CONTENT** - Identify:
   - Main concepts and topics
   - Learning objectives
   - Key information and takeaways

Format your response clearly with sections for OCR text extraction and visual analysis.`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: base64Image
                  }
                }
              ]
            }
          ],
          temperature: 0.3, // Lower temperature for more accurate OCR
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }

      setProcessingStatus('extracting');

      const data = await response.json();
      const extractedContent = data.choices?.[0]?.message?.content;

      if (!extractedContent) {
        throw new Error('No content extracted from image');
      }

      // Parse the response to separate OCR text and description
      const sections = extractedContent.split(/(?=\d+\.\s+\*\*[A-Z\s]+\*\*)/);
      const analysisSection = sections.find((s: string) => s.includes('VISUAL ANALYSIS') || s.includes('ANALYSIS')) || '';
      
      const processedData = {
        text: extractedContent, // Full extracted content
        description: analysisSection || 'Image analyzed successfully',
        filename: selectedFile.name
      };

      setProcessingStatus('success');
      onImageProcessed(processedData);
      
      toast.success('Image processed successfully! Text and content extracted.');
      
      // Keep the result visible for review
      setTimeout(() => {
        setIsProcessing(false);
      }, 1500);

    } catch (error: any) {
      console.error('Image processing error:', error);
      setProcessingStatus('error');
      toast.error(error.message || 'Failed to process image. Please check your API key and try again.');
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
            <h1 className="text-3xl font-bold text-foreground mb-1">Advanced Image Recognition & OCR</h1>
            <p className="text-muted-foreground">Extract text and analyze diagrams from any image using AI</p>
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
                <div className="text-2xl font-bold text-foreground">OCR</div>
                <div className="text-xs text-muted-foreground">Text Extraction</div>
              </div>
            </div>
          </div>
          <div className="glass-card p-4 rounded-xl border border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">Vision AI</div>
                <div className="text-xs text-muted-foreground">Content Analysis</div>
              </div>
            </div>
          </div>
          <div className="glass-card p-4 rounded-xl border border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Scan className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">Smart</div>
                <div className="text-xs text-muted-foreground">Diagram Recognition</div>
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
            className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl hover:from-purple-600 hover:to-indigo-600 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
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

          {/* Tips */}
          <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
            <h4 className="text-sm font-semibold text-foreground mb-2">💡 Pro Tips:</h4>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Works with printed text, handwriting, and mathematical equations</li>
              <li>Analyzes diagrams, charts, tables, and graphs</li>
              <li>Higher resolution images provide better accuracy</li>
              <li>Supports multiple languages and technical notation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
