import React, { useEffect, useReducer, useRef, useState, useCallback, memo } from "react";
import {
  Upload as UploadIcon,
  FileText,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Loader2,
  X,
  RotateCcw,
  Inbox,
} from "lucide-react";

// ================================================================================================
// 1. TYPE DEFINITIONS
// ================================================================================================

/** The base type for an already uploaded file, provided from props. */
export interface Upload {
  id: string;
  filename: string;
  size: number;
  uploadedAt: string;
  status?: string;
  processed?: boolean;
  indexed?: boolean;
  slideCount?: number;
}

/** Represents the status of a file currently being managed by the uploader. */
type UploadStatus =
  | "pending"    // Waiting in the queue.
  | "uploading"  // Actively being uploaded.
  | "processing" // Uploaded, server is processing.
  | "success"    // Successfully uploaded.
  | "error"      // An error occurred.
  | "cancelled"; // Canceled by the user.

/** Represents a file in the upload queue within the component's state. */
interface UploadEntry {
  tempId: string;
  file: File;
  progress: number; // 0-100
  status: UploadStatus;
  errorMessage?: string;
  controller: AbortController;
}

/** Type hint for server-side processing. */
type ClientHint = { mime?: string; ext?: string; pipeline?: string };

/** Props for the UploadManager component. */
interface UploadManagerProps {
  uploads: Upload[];
  onAddUpload: (file: File, opts: { signal: AbortSignal; clientHint: ClientHint; onProgress: (percent: number) => void }) => Promise<Upload>;
  onDeleteUpload: (id: string) => void;
  maxFileSizeMB?: number;
  maxFiles?: number;
  concurrency?: number;
}

// ================================================================================================
// 2. CONFIGURATION & UTILITIES
// ================================================================================================

const UPLOADER_CONFIG = {
  maxFileSizeMB: 50,
  maxFiles: 20,
  concurrency: 3,
  allowedMimeTypes: new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
  ]),
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const genTempId = (file: File) => `tmp-${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).substring(2, 9)}`;

const detectFileType = async (file: File): Promise<ClientHint> => {
    try {
        const slice = file.slice(0, 4);
        const buffer = await slice.arrayBuffer();
        const view = new DataView(buffer);
        const signature = view.getUint32(0, false);
        const ext = (file.name.split(".").pop() || "").toLowerCase();

        // %PDF
        if (signature === 0x25504446 || ext === "pdf") {
            return { mime: "application/pdf", ext: "pdf", pipeline: "pdf_text_pipeline" };
        }
        // PK.. (ZIP archive / PPTX)
        if (signature === 0x504b0304 && ["ppt", "pptx"].includes(ext)) {
            return { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", ext, pipeline: "pptx_pipeline" };
        }
        
        return { mime: file.type, ext };
    } catch (e) {
        console.warn("File type detection failed", e);
        return { mime: file.type, ext: (file.name.split(".").pop() || "").toLowerCase() };
    }
};


// ================================================================================================
// 3. STATE MANAGEMENT (useReducer with Action Creators)
// ================================================================================================

type UploaderState = {
  entries: UploadEntry[];
  uploadsInProgress: number;
};

const uploaderActions = {
  add: (payload: UploadEntry[]) => ({ type: "ADD", payload } as const),
  updateStatus: (tempId: string, status: UploadStatus, errorMessage?: string) => ({ type: "UPDATE_STATUS", tempId, status, errorMessage } as const),
  updateProgress: (tempId: string, progress: number) => ({ type: "UPDATE_PROGRESS", tempId, progress } as const),
  remove: (tempId: string) => ({ type: "REMOVE", tempId } as const),
  retry: (tempId: string) => ({ type: "RETRY", tempId } as const),
  clearAll: () => ({ type: "CLEAR_ALL" } as const),
  incrementInProgress: () => ({ type: "INCREMENT_IN_PROGRESS" } as const),
  decrementInProgress: () => ({ type: "DECREMENT_IN_PROGRESS" } as const),
};

type UploaderAction = ReturnType<typeof uploaderActions[keyof typeof uploaderActions]>;

const uploaderReducer = (state: UploaderState, action: UploaderAction): UploaderState => {
  switch (action.type) {
    case "ADD":
      return { ...state, entries: [...state.entries, ...action.payload] };
    case "UPDATE_STATUS":
      return {
        ...state,
        entries: state.entries.map((e) =>
          e.tempId === action.tempId ? { ...e, status: action.status, progress: action.status === "error" ? 0 : e.progress, errorMessage: action.errorMessage || "" } : e
        ),
      };
    case "UPDATE_PROGRESS":
      return {
        ...state,
        entries: state.entries.map((e) => (e.tempId === action.tempId ? { ...e, progress: action.progress } : e)),
      };
    case "REMOVE":
      return { ...state, entries: state.entries.filter((e) => e.tempId !== action.tempId) };
    case "RETRY":
       return {
         ...state,
         entries: state.entries.map((e) => (e.tempId === action.tempId ? { ...e, status: "pending", controller: new AbortController() } : e)),
       }
    case "CLEAR_ALL":
      state.entries.forEach(e => e.status === "uploading" && e.controller.abort());
      return { ...state, entries: [], uploadsInProgress: 0 };
    case "INCREMENT_IN_PROGRESS":
      return { ...state, uploadsInProgress: state.uploadsInProgress + 1 };
    case "DECREMENT_IN_PROGRESS":
      return { ...state, uploadsInProgress: Math.max(0, state.uploadsInProgress - 1) };
    default:
      return state;
  }
};


// ================================================================================================
// 4. UI SUB-COMPONENTS
// ================================================================================================

const UploadDropzone = memo(({ onFilesAdded }: { onFilesAdded: (files: File[]) => void }) => {
    const [dragActive, setDragActive] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onFilesAdded(Array.from(e.dataTransfer.files));
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFilesAdded(Array.from(e.target.files));
            e.target.value = ""; // Reset input
        }
    };
    
    return (
        <div
            role="button"
            tabIndex={0}
            aria-label="File upload dropzone"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
            onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ease-in-out cursor-pointer ${
                dragActive ? "border-secondary bg-secondary/10" : "border-border hover:border-secondary"
            }`}
        >
            <UploadIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground">Drop files or click to upload</h3>
            <p className="text-sm text-muted-foreground">PDF and PPTX supported</p>
            <input ref={inputRef} type="file" multiple className="hidden" onChange={handleChange} accept=".pdf,.pptx,.ppt"/>
        </div>
    );
});

const FileListItem = memo(({ entry, onCancel, onRemove, onRetry }: { entry: UploadEntry; onCancel: () => void; onRemove: () => void; onRetry: () => void; }) => {
    const { status, progress, file, errorMessage } = entry;
    
    const getStatusInfo = () => {
        switch (status) {
            case "pending": return { icon: <Clock className="w-5 h-5 text-muted-foreground" />, text: "Pending...", color: "bg-muted/20 text-foreground" };
            case "uploading": return { icon: <Loader2 className="w-5 h-5 animate-spin text-secondary" />, text: "Uploading...", color: "bg-secondary/10 text-secondary" };
            case "processing": return { icon: <Loader2 className="w-5 h-5 animate-spin text-primary" />, text: "Processing...", color: "bg-primary/10 text-primary" };
            case "success": return { icon: <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />, text: "Success", color: "bg-green-500/10 text-green-600 dark:text-green-400" };
            case "error": return { icon: <AlertCircle className="w-5 h-5 text-rose-600 dark:text-red-400" />, text: "Error", color: "bg-rose-500/10 text-rose-600 dark:text-red-400" };
            case "cancelled": return { icon: <XCircle className="w-5 h-5 text-muted-foreground" />, text: "Cancelled", color: "bg-muted/20 text-muted-foreground" };
        }
    };
    const { icon, text, color } = getStatusInfo();

    return (
        <div className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate" title={file.name}>{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                     { (status === 'uploading' || status === 'processing') && (
                        <div className="mt-2 w-full bg-muted/30 rounded-full h-2">
                            <div className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-300 shadow-sm shadow-primary/20" 
                                style={{ width: `${progress}%` }}
                                role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} />
                        </div>
                     )}
                     {status === "error" && <p className="text-xs text-rose-600 dark:text-red-400 mt-1 truncate" title={errorMessage}>{errorMessage}</p>}
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <span className={`hidden sm:inline-flex items-center gap-2 px-2 py-1 text-xs rounded-full ${color}`}>{icon}{text}</span>
                 {status === "uploading" && <button onClick={onCancel} title="Cancel" className="p-1.5 text-muted-foreground hover:bg-muted/50 rounded-md transition-colors"><X className="w-4 h-4" /></button>}
                 {(status === "error" || status === "cancelled") && <button onClick={onRetry} title="Retry" className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors"><RotateCcw className="w-4 h-4" /></button>}
                 {(status === "error" || status === "cancelled" || status === "success") && <button onClick={onRemove} title="Remove" className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>}
            </div>
        </div>
    );
});

const UploadedFileItem = memo(({ upload, onDelete }: { upload: Upload; onDelete: () => void; }) => (
    <div className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 glass-card border border-border/40 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{upload.filename}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(upload.size ?? 0)} • Uploaded on {new Date(upload.uploadedAt).toLocaleDateString()}</p>
            </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <button onClick={onDelete} title="Delete" className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
        </div>
    </div>
));

// ================================================================================================
// 5. MAIN COMPONENT
// ================================================================================================

/**
 * A comprehensive file upload manager component for React.
 * It handles file validation, queuing, concurrent uploads, and progress tracking.
 */
export const UploadManager: React.FC<UploadManagerProps> = ({
  uploads,
  onAddUpload,
  onDeleteUpload,
  maxFileSizeMB = UPLOADER_CONFIG.maxFileSizeMB,
  maxFiles = UPLOADER_CONFIG.maxFiles,
  concurrency = UPLOADER_CONFIG.concurrency,
}) => {
  const [state, dispatch] = useReducer(uploaderReducer, { entries: [], uploadsInProgress: 0 });
  const [globalError, setGlobalError] = useState<string | null>(null);
  const onAddUploadRef = useRef(onAddUpload);
  onAddUploadRef.current = onAddUpload;

  /** Main worker function for a single file upload. */
  const uploadWorker = useCallback(async (entry: UploadEntry) => {
    try {
      const onProgress = (percent: number) => {
        dispatch(uploaderActions.updateProgress(entry.tempId, percent));
      };
      
      const clientHint = await detectFileType(entry.file);
      await onAddUploadRef.current(entry.file, { signal: entry.controller.signal, clientHint, onProgress });

      dispatch(uploaderActions.updateStatus(entry.tempId, "processing"));
      await new Promise(r => setTimeout(r, 400)); // UX delay for processing
      dispatch(uploaderActions.updateStatus(entry.tempId, "success"));
      setTimeout(() => dispatch(uploaderActions.remove(entry.tempId)), 1200);

    } catch (error: any) {
      if (entry.controller.signal.aborted) {
        dispatch(uploaderActions.updateStatus(entry.tempId, "cancelled"));
      } else {
        dispatch(uploaderActions.updateStatus(entry.tempId, "error", error?.message || "Upload failed"));
      }
    } finally {
      dispatch(uploaderActions.decrementInProgress());
    }
  }, []);

  /** Effect to manage the automatic upload queue */
  useEffect(() => {
    const pendingEntries = state.entries.filter((e) => e.status === "pending");
    const canStartCount = concurrency - state.uploadsInProgress;

    if (pendingEntries.length > 0 && canStartCount > 0) {
      const entriesToStart = pendingEntries.slice(0, canStartCount);
      for (const entry of entriesToStart) {
        dispatch(uploaderActions.incrementInProgress());
        dispatch(uploaderActions.updateStatus(entry.tempId, "uploading"));
        uploadWorker(entry);
      }
    }
  }, [state.entries, state.uploadsInProgress, concurrency, uploadWorker]);
  
  /** Validates and adds files to the queue. */
  const addFilesToQueue = useCallback((files: File[]) => {
    setGlobalError(null);
    const currentTotal = uploads.length + state.entries.length;
    if (currentTotal + files.length > maxFiles) {
        setGlobalError(`Cannot add ${files.length} files. You would exceed the limit of ${maxFiles}.`);
        return;
    }

    const newEntries = files.map((file): UploadEntry | {error: string} => {
        const existing = uploads.some(u => u.filename === file.name && u.size === file.size) || state.entries.some(e => e.file.name === file.name && e.file.size === file.size);
        if (existing) return { error: "Duplicate file." };
        if (file.size === 0) return { error: "File is empty (0 bytes)." };
        if (!UPLOADER_CONFIG.allowedMimeTypes.has(file.type) && !/\.(pdf|pptx|ppt)$/i.test(file.name)) return { error: "Unsupported file type." };
        if (file.size > maxFileSizeMB * 1024 * 1024) return { error: `Exceeds ${maxFileSizeMB}MB limit.` };
        return {
            tempId: genTempId(file), file, status: "pending", progress: 0, controller: new AbortController()
        };
    });
    
    const validEntries = newEntries.filter((e): e is UploadEntry => !('error' in e));
    const errors = newEntries.filter((e): e is {error: string} => 'error' in e);
    if(errors.length > 0) {
        const uniqueErrors = [...new Set(errors.map(e => e.error))];
        if (uniqueErrors.length === 1) {
            setGlobalError(`${errors.length} file(s) could not be added: ${uniqueErrors[0]}`);
        } else {
            setGlobalError(`${errors.length} file(s) could not be added: ${uniqueErrors.join(', ')}`);
        }
    }
    
    if(validEntries.length > 0) dispatch(uploaderActions.add(validEntries));

  }, [uploads, state.entries, maxFiles, maxFileSizeMB]);

  const handleCancel = useCallback((tempId: string) => {
    const entry = state.entries.find(e => e.tempId === tempId);
    if (entry) {
        entry.controller.abort();
        dispatch(uploaderActions.updateStatus(tempId, 'cancelled'));
    }
  }, [state.entries]);

  const handleRemove = useCallback((tempId: string) => {
      dispatch(uploaderActions.remove(tempId));
  }, []);
  
  const handleRetry = useCallback((tempId: string) => {
      dispatch(uploaderActions.retry(tempId));
  }, []);

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      onDeleteUpload(id);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center p-4">
        <h1 className="text-3xl font-bold text-foreground">Upload Documents</h1>
        <p className="text-muted-foreground mt-1">Uploads will start automatically. Concurrency: {concurrency}.</p>
      </div>

      <div className="glass-card rounded-xl p-6 shadow-sm border border-border/40">
        <UploadDropzone onFilesAdded={addFilesToQueue} />
        {globalError && <div className="mt-3 text-sm text-center text-rose-600 dark:text-red-400 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">{globalError}</div>}
      </div>

      {/* Upload Queue Section */}
      <div className="glass-card rounded-xl shadow-sm border border-border/40">
        <div className="p-4 border-b border-border/40">
            <h2 className="text-lg font-semibold text-foreground">Upload Queue</h2>
        </div>
        {state.entries.length > 0 ? (
            <div className="divide-y divide-border/40">
                {state.entries.map(entry => (
                    <FileListItem 
                        key={entry.tempId} 
                        entry={entry} 
                        onCancel={() => handleCancel(entry.tempId)} 
                        onRemove={() => handleRemove(entry.tempId)} 
                        onRetry={() => handleRetry(entry.tempId)}
                    />
                ))}
            </div>
        ) : (
            <div className="p-8 text-center text-muted-foreground">
                <Inbox className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p>No files in the upload queue.</p>
            </div>
        )}
      </div>

      {/* Processed Documents Section */}
      <div className="glass-card rounded-xl shadow-sm border border-border/40">
        <div className="p-4 border-b border-border/40">
            <h2 className="text-lg font-semibold text-foreground">Processed Documents</h2>
        </div>
        {uploads.length > 0 ? (
            <div className="divide-y divide-border/40">
                {uploads.map(upload => (
                    <UploadedFileItem
                        key={upload.id}
                        upload={upload}
                        onDelete={() => handleDelete(upload.id)}
                    />
                ))}
            </div>
        ) : (
            <div className="p-8 text-center text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p>No documents have been uploaded yet.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default UploadManager;
