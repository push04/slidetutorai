/**
 * Persistent Storage Service using IndexedDB
 * Data survives page navigation, refresh, and feature switching
 */

const DB_NAME = 'SlideTutorDB';
const DB_VERSION = 1;

export interface StoredUpload {
  id: string;
  filename: string;
  size: number;
  uploadedAt: string;
  processed: boolean;
  indexed: boolean;
  slideCount: number;
  fullText: string;
  status: string;
  processingProgress?: number;
  estimatedTimeRemaining?: number;
}

export interface StoredLesson {
  id: string;
  title: string;
  content: string;
  uploadId?: string;
  youtubeUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredQuiz {
  id: string;
  title: string;
  questions: any[];
  uploadId?: string;
  youtubeUrl?: string;
  createdAt: string;
  score?: number;
}

export interface StoredFlashcard {
  id: string;
  question: string;
  answer: string;
  hint?: string;
  uploadId?: string;
  lastReviewed?: string;
  nextReview?: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  createdAt: string;
}

export interface ProcessingJob {
  id: string;
  type: 'upload' | 'lesson' | 'quiz' | 'flashcard';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  startTime: number;
  estimatedEndTime?: number;
  uploadId?: string;
  result?: any;
  error?: string;
}

class PersistentStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[PersistentStorage] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[PersistentStorage] Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('uploads')) {
          const uploadStore = db.createObjectStore('uploads', { keyPath: 'id' });
          uploadStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
          uploadStore.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains('lessons')) {
          const lessonStore = db.createObjectStore('lessons', { keyPath: 'id' });
          lessonStore.createIndex('createdAt', 'createdAt', { unique: false });
          lessonStore.createIndex('uploadId', 'uploadId', { unique: false });
        }

        if (!db.objectStoreNames.contains('quizzes')) {
          const quizStore = db.createObjectStore('quizzes', { keyPath: 'id' });
          quizStore.createIndex('createdAt', 'createdAt', { unique: false });
          quizStore.createIndex('uploadId', 'uploadId', { unique: false });
        }

        if (!db.objectStoreNames.contains('flashcards')) {
          const flashcardStore = db.createObjectStore('flashcards', { keyPath: 'id' });
          flashcardStore.createIndex('createdAt', 'createdAt', { unique: false });
          flashcardStore.createIndex('nextReview', 'nextReview', { unique: false });
          flashcardStore.createIndex('uploadId', 'uploadId', { unique: false });
        }

        if (!db.objectStoreNames.contains('processingJobs')) {
          const jobStore = db.createObjectStore('processingJobs', { keyPath: 'id' });
          jobStore.createIndex('status', 'status', { unique: false });
          jobStore.createIndex('type', 'type', { unique: false });
          jobStore.createIndex('startTime', 'startTime', { unique: false });
        }

        console.log('[PersistentStorage] Database schema created/updated');
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (this.initPromise) {
      await this.initPromise;
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  // Upload operations
  async saveUpload(upload: StoredUpload): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['uploads'], 'readwrite');
      const store = transaction.objectStore('uploads');
      const request = store.put(upload);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getUploads(): Promise<StoredUpload[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['uploads'], 'readonly');
      const store = transaction.objectStore('uploads');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getUpload(id: string): Promise<StoredUpload | undefined> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['uploads'], 'readonly');
      const store = transaction.objectStore('uploads');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteUpload(id: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['uploads'], 'readwrite');
      const store = transaction.objectStore('uploads');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Lesson operations
  async saveLesson(lesson: StoredLesson): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['lessons'], 'readwrite');
      const store = transaction.objectStore('lessons');
      const request = store.put(lesson);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getLessons(): Promise<StoredLesson[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['lessons'], 'readonly');
      const store = transaction.objectStore('lessons');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteLesson(id: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['lessons'], 'readwrite');
      const store = transaction.objectStore('lessons');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Quiz operations
  async saveQuiz(quiz: StoredQuiz): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['quizzes'], 'readwrite');
      const store = transaction.objectStore('quizzes');
      const request = store.put(quiz);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getQuizzes(): Promise<StoredQuiz[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['quizzes'], 'readonly');
      const store = transaction.objectStore('quizzes');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteQuiz(id: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['quizzes'], 'readwrite');
      const store = transaction.objectStore('quizzes');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Flashcard operations
  async saveFlashcard(flashcard: StoredFlashcard): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['flashcards'], 'readwrite');
      const store = transaction.objectStore('flashcards');
      const request = store.put(flashcard);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveFlashcards(flashcards: StoredFlashcard[]): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['flashcards'], 'readwrite');
      const store = transaction.objectStore('flashcards');
      
      let completed = 0;
      flashcards.forEach(flashcard => {
        const request = store.put(flashcard);
        request.onsuccess = () => {
          completed++;
          if (completed === flashcards.length) resolve();
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  async getFlashcards(): Promise<StoredFlashcard[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['flashcards'], 'readonly');
      const store = transaction.objectStore('flashcards');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFlashcard(id: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['flashcards'], 'readwrite');
      const store = transaction.objectStore('flashcards');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Processing job operations
  async saveProcessingJob(job: ProcessingJob): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['processingJobs'], 'readwrite');
      const store = transaction.objectStore('processingJobs');
      const request = store.put(job);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getProcessingJobs(status?: string): Promise<ProcessingJob[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['processingJobs'], 'readonly');
      const store = transaction.objectStore('processingJobs');
      
      if (status) {
        const index = store.index('status');
        const request = index.getAll(status);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      } else {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      }
    });
  }

  async getProcessingJob(id: string): Promise<ProcessingJob | undefined> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['processingJobs'], 'readonly');
      const store = transaction.objectStore('processingJobs');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteProcessingJob(id: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['processingJobs'], 'readwrite');
      const store = transaction.objectStore('processingJobs');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Clear all data (for testing/reset)
  async clearAll(): Promise<void> {
    const db = await this.ensureDB();
    const stores = ['uploads', 'lessons', 'quizzes', 'flashcards', 'processingJobs'];
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(stores, 'readwrite');
      let completed = 0;
      
      stores.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        
        request.onsuccess = () => {
          completed++;
          if (completed === stores.length) resolve();
        };
        request.onerror = () => reject(request.error);
      });
    });
  }
}

// Singleton instance
export const persistentStorage = new PersistentStorage();
