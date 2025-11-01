// Browser storage service using IndexedDB with localStorage fallback
// Replaces Supabase for local-only data persistence

const DB_NAME = 'slidetutor_db';
const DB_VERSION = 1;
const STORES = {
  uploads: 'uploads',
  lessons: 'lessons',
  quizzes: 'quizzes',
  flashcards: 'flashcards',
  chats: 'chats',
  profile: 'profile',
  studySessions: 'study_sessions',
  goals: 'goals',
  bookmarks: 'bookmarks',
  tags: 'tags',
};

class StorageService {
  private db: IDBDatabase | null = null;
  private useLocalStorage = false;

  async init(): Promise<void> {
    if (!window.indexedDB) {
      console.warn('IndexedDB not available, falling back to localStorage');
      this.useLocalStorage = true;
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB error, falling back to localStorage');
        this.useLocalStorage = true;
        resolve();
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        Object.values(STORES).forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            // Create indexes for common queries
            if (storeName !== STORES.profile) {
              store.createIndex('createdAt', 'createdAt', { unique: false });
              store.createIndex('updatedAt', 'updatedAt', { unique: false });
            }
            if (storeName === STORES.flashcards || storeName === STORES.quizzes) {
              store.createIndex('uploadId', 'uploadId', { unique: false });
            }
          }
        });
      };
    });
  }

  // Generic CRUD operations
  async getAll<T>(storeName: string): Promise<T[]> {
    if (this.useLocalStorage) {
      const data = localStorage.getItem(storeName);
      return data ? JSON.parse(data) : [];
    }

    if (!this.db) await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getById<T>(storeName: string, id: string): Promise<T | null> {
    if (this.useLocalStorage) {
      const data = localStorage.getItem(storeName);
      if (!data) return null;
      const items = JSON.parse(data);
      return items.find((item: any) => item.id === id) || null;
    }

    if (!this.db) await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async create<T extends { id: string }>(storeName: string, data: T): Promise<T> {
    const item = {
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (this.useLocalStorage) {
      const existing = localStorage.getItem(storeName);
      const items = existing ? JSON.parse(existing) : [];
      items.push(item);
      localStorage.setItem(storeName, JSON.stringify(items));
      return item as T;
    }

    if (!this.db) await this.init();
    if (!this.db) throw new Error('Storage not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(item);

      request.onsuccess = () => resolve(item as T);
      request.onerror = () => reject(request.error);
    });
  }

  async update<T extends { id: string }>(storeName: string, id: string, data: Partial<T>): Promise<T> {
    if (this.useLocalStorage) {
      const existing = localStorage.getItem(storeName);
      const items = existing ? JSON.parse(existing) : [];
      const index = items.findIndex((item: any) => item.id === id);
      
      if (index === -1) throw new Error('Item not found');
      
      items[index] = {
        ...items[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(storeName, JSON.stringify(items));
      return items[index];
    }

    if (!this.db) await this.init();
    if (!this.db) throw new Error('Storage not initialized');

    return new Promise(async (resolve, reject) => {
      const existing = await this.getById<T>(storeName, id);
      if (!existing) {
        reject(new Error('Item not found'));
        return;
      }

      const updated = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      };

      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(updated);

      request.onsuccess = () => resolve(updated as T);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    if (this.useLocalStorage) {
      const existing = localStorage.getItem(storeName);
      const items = existing ? JSON.parse(existing) : [];
      const filtered = items.filter((item: any) => item.id !== id);
      localStorage.setItem(storeName, JSON.stringify(filtered));
      return;
    }

    if (!this.db) await this.init();
    if (!this.db) throw new Error('Storage not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteAll(storeName: string): Promise<void> {
    if (this.useLocalStorage) {
      localStorage.removeItem(storeName);
      return;
    }

    if (!this.db) await this.init();
    if (!this.db) throw new Error('Storage not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Query by index
  async getByIndex<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
    if (this.useLocalStorage) {
      const data = localStorage.getItem(storeName);
      if (!data) return [];
      const items = JSON.parse(data);
      return items.filter((item: any) => item[indexName] === value);
    }

    if (!this.db) await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Specific store helpers
  getUploads = () => this.getAll(STORES.uploads);
  getUploadById = (id: string) => this.getById(STORES.uploads, id);
  createUpload = (data: any) => this.create(STORES.uploads, data);
  updateUpload = (id: string, data: any) => this.update(STORES.uploads, id, data);
  deleteUpload = (id: string) => this.delete(STORES.uploads, id);

  getLessons = () => this.getAll(STORES.lessons);
  getLessonById = (id: string) => this.getById(STORES.lessons, id);
  createLesson = (data: any) => this.create(STORES.lessons, data);
  updateLesson = (id: string, data: any) => this.update(STORES.lessons, id, data);
  deleteLesson = (id: string) => this.delete(STORES.lessons, id);

  getQuizzes = () => this.getAll(STORES.quizzes);
  getQuizById = (id: string) => this.getById(STORES.quizzes, id);
  createQuiz = (data: any) => this.create(STORES.quizzes, data);
  updateQuiz = (id: string, data: any) => this.update(STORES.quizzes, id, data);
  deleteQuiz = (id: string) => this.delete(STORES.quizzes, id);

  getFlashcards = () => this.getAll(STORES.flashcards);
  getFlashcardById = (id: string) => this.getById(STORES.flashcards, id);
  createFlashcard = (data: any) => this.create(STORES.flashcards, data);
  updateFlashcard = (id: string, data: any) => this.update(STORES.flashcards, id, data);
  deleteFlashcard = (id: string) => this.delete(STORES.flashcards, id);

  getChats = () => this.getAll(STORES.chats);
  getChatById = (id: string) => this.getById(STORES.chats, id);
  createChat = (data: any) => this.create(STORES.chats, data);
  updateChat = (id: string, data: any) => this.update(STORES.chats, id, data);
  deleteChat = (id: string) => this.delete(STORES.chats, id);

  getProfile = async () => {
    const profiles = await this.getAll(STORES.profile);
    return profiles[0] || null;
  };
  setProfile = async (data: any) => {
    const existing = await this.getProfile();
    if (existing) {
      return this.update(STORES.profile, existing.id, data);
    }
    return this.create(STORES.profile, { ...data, id: 'default-profile' });
  };

  getGoals = () => this.getAll(STORES.goals);
  createGoal = (data: any) => this.create(STORES.goals, data);
  updateGoal = (id: string, data: any) => this.update(STORES.goals, id, data);
  deleteGoal = (id: string) => this.delete(STORES.goals, id);

  getBookmarks = () => this.getAll(STORES.bookmarks);
  createBookmark = (data: any) => this.create(STORES.bookmarks, data);
  deleteBookmark = (id: string) => this.delete(STORES.bookmarks, id);

  getTags = () => this.getAll(STORES.tags);
  createTag = (data: any) => this.create(STORES.tags, data);
  deleteTag = (id: string) => this.delete(STORES.tags, id);

  getStudySessions = () => this.getAll(STORES.studySessions);
  createStudySession = (data: any) => this.create(STORES.studySessions, data);

  // Export/Import for backup
  async exportAll(): Promise<string> {
    const data: any = {};
    
    for (const [key, storeName] of Object.entries(STORES)) {
      data[key] = await this.getAll(storeName);
    }

    return JSON.stringify(data, null, 2);
  }

  async importAll(jsonData: string): Promise<void> {
    const data = JSON.parse(jsonData);

    for (const [key, storeName] of Object.entries(STORES)) {
      if (data[key]) {
        await this.deleteAll(storeName);
        for (const item of data[key]) {
          await this.create(storeName, item);
        }
      }
    }
  }
}

// Singleton instance
export const storage = new StorageService();

// Initialize on app load
storage.init().catch(console.error);
