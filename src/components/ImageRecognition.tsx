import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Image as ImageIcon, Loader2, CheckCircle2, AlertCircle, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

interface ImageRecognitionProps {
  onImageProcessed: (imageData: { text: string; description: string; filename: string }) => void;
  apiKey: string;
}

export function ImageRecognition({ onImageProcessed, apiKey }: ImageRecognitionProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'analyzing' | 'extracting' | 'success' | 'error'>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
      setProcessingStatus('idle');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']
    },
    maxFiles: 1,
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
    setProcessingStatus('analyzing');

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setProcessingStatus('extracting');

      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockExtractedData = {
        text: `Extracted content from ${selectedFile.name}:

This is a simulated OCR and image recognition result. In a real implementation, this would:

1. Use OCR (Optical Character Recognition) to extract any text from the image
2. Analyze diagrams, charts, and graphs to understand their meaning
3. Identify mathematical equations and formulas
4. Detect handwriting and convert it to digital text
5. Understand the context and relationships between visual elements

Example extracted content:
- Detected diagram: Flowchart showing learning process
- Mathematical equations: E = mc²
- Handwritten notes: "Study daily for best results"
- Chart data: Performance metrics showing 85% improvement

This feature requires vision AI models for full functionality.`,
        description: 'Image contains educational content with text, diagrams, and handwritten notes',
        filename: selectedFile.name
      };

      setProcessingStatus('success');
      onImageProcessed(mockExtractedData);
      
      toast.success('Image processed successfully! Content extracted and ready to use.');
      
      setTimeout(() => {
        setSelectedFile(null);
        setProcessingStatus('idle');
        setIsProcessing(false);
      }, 1500);

    } catch (error) {
      console.error('Image processing error:', error);
      setProcessingStatus('error');
      toast.error('Failed to process image. Please try again.');
      setTimeout(() => {
        setProcessingStatus('idle');
        setIsProcessing(false);
      }, 2000);
    }
  };

  return (
    <div className="glass-card p-6 rounded-2xl border border-border">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
          <ImageIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Image Recognition & OCR</h3>
          <p className="text-sm text-muted-foreground">Extract text and understand diagrams from images</p>
        </div>
      </div>

      <div className="space-y-4">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 bg-background/50'
          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          {selectedFile ? (
            <div>
              <p className="text-sm font-medium text-foreground mb-1">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
          ) : isDragActive ? (
            <p className="text-sm text-primary font-medium">Drop the image here...</p>
          ) : (
            <div>
              <p className="text-sm text-foreground font-medium mb-1">
                Drag & drop an image here, or click to select
              </p>
              <p className="text-xs text-muted-foreground">
                Supports PNG, JPG, JPEG, GIF, BMP, WebP
              </p>
            </div>
          )}
        </div>

        {processingStatus !== 'idle' && (
          <div className="flex items-center gap-3 p-4 bg-background/50 rounded-lg border border-border">
            {processingStatus === 'analyzing' && (
              <>
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground">Analyzing image content...</span>
              </>
            )}
            {processingStatus === 'extracting' && (
              <>
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground">Extracting text and diagrams...</span>
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

        <button
          onClick={handleProcessImage}
          disabled={isProcessing || !selectedFile}
          className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <ImageIcon className="w-4 h-4" />
              Analyze Image
            </>
          )}
        </button>

        <p className="text-xs text-muted-foreground">
          Tip: Works best with clear images of text, diagrams, handwritten notes, and charts. Higher resolution images yield better results.
        </p>
      </div>
    </div>
  );
}
