# Project File Overview

This repository retains all source files from previous iterations. Key locations:

- `src/` – application source organized by feature.
  - `components/` – UI components such as `UploadManager.tsx`, `Navigation.tsx`, `LessonGenerator.tsx`, and other feature views.
  - `contexts/` – React context providers (e.g., `ThemeContext.tsx`, `AuthContext.tsx`, `FlashcardContext.tsx`).
  - `hooks/` – shared hooks including storage helpers (`useLocalStorage.ts`, `usePersistentState.ts`) and data access (`useSupabaseQuery.ts`).
  - `lib/` – utilities and integration helpers like `largeFileProcessor.ts`, `openrouter.ts`, and `queryClient.ts`.
  - `services/` – core domain services such as `FileProcessor.ts`, `ChunkedAIProcessor.ts`, `OpenRouterAPI.ts`, and SM-2 scheduling logic in `sm2.ts`.
  - `utils/` – helper functions for exports, chunking, and YouTube handling.
- Root configuration and build tooling live beside this file: Vite entry (`main.tsx`), Tailwind config, eslint config, and Netlify deployment files.
- `public/` – static assets served by Vite.
- `attached_assets/` – binary or reference assets that shipped with earlier revisions.

If you need the complete content of any file, open it directly from the listed paths. The git history retains prior revisions for reference.
