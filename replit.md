# SlideTutor AI - AI-Powered Learning Platform

## Overview
SlideTutor AI is a production-ready learning platform designed to transform educational content into interactive lessons, quizzes, and flashcards using AI. It features a modern, dark-mode-only UI and aims to provide a comprehensive and engaging learning experience. The project emphasizes gamification, robust security, and a scalable architecture to support a rich set of learning activities and user interactions.

## User Preferences
I prefer simple language and clear explanations. I want iterative development with frequent, small updates rather than large, infrequent ones. Please ask before making any major architectural changes or introducing new dependencies. I prefer to be involved in decisions regarding UI/UX, especially color schemes and design patterns.

## System Architecture
The application is built with a strong focus on a dark-mode-only UI, featuring glass morphism effects and gradient animations for a sleek, modern aesthetic. It employs a responsive design for compatibility across devices and prioritizes accessibility with keyboard navigation and ARIA labels.

**Technical Implementations:**
-   **Frontend:** React 18, TypeScript, Vite
-   **Styling:** Tailwind CSS, Custom CSS Variables
-   **State Management:** React Query (server state), Zustand (flashcard context), React Context (auth, theme), useState (local component state)
-   **Authentication:** Supabase Auth (mandatory, RLS enabled, social auth supported)
-   **Database:** Supabase (PostgreSQL) with a comprehensive schema (23+ tables) for user profiles, content, learning activities, and gamification. RLS policies ensure data security.
-   **AI:** OpenRouter API (GPT-4, Claude, etc.) for content generation and Q&A.
-   **File Processing:** PDF.js for PDF text extraction, JSZip for PPTX.
-   **UI Components:** Radix UI, Lucide Icons
-   **Rich Text:** TipTap Editor
-   **Charts:** Recharts
-   **Routing:** TanStack Router
-   **Animations:** Framer Motion

**Feature Specifications:**
-   **AI-Powered Content:** Generate lessons, quizzes, and flashcards from uploaded PDF/PPTX files.
-   **Adaptive Learning:** Quizzes with multiple question types, explanations, and adaptive difficulty. Spaced repetition (SM-2 algorithm) for flashcards.
-   **Gamification:** XP, levels, streaks, achievements (4 tiers, 5 categories), and leaderboards (Daily, Weekly, Monthly, All-time).
-   **Content Management:** File uploads, bookmarks, custom tags, rich text notes.
-   **User Engagement:** Chat Q&A with AI, goals tracking, analytics dashboard, global search across all content.
-   **Security:** Mandatory Supabase authentication, Row Level Security, secure sessions with auto-refresh tokens.

**System Design Choices:**
-   **UI/UX:** Dark mode, glass morphism, gradient animations, responsive, accessible.
-   **Database:** Supabase (PostgreSQL) with a highly normalized schema and performance-optimized indexes.
-   **Modularity:** Clear code organization (`components`, `contexts`, `hooks`, `lib`, `services`, `types`).
-   **Deployment:** Configured for Replit deployment, also compatible with static hosting services.

## External Dependencies
-   **Supabase:** Database (PostgreSQL), Authentication, Realtime features.
-   **OpenRouter API:** AI model integration (GPT-4, Claude, etc.) for content generation and chat.
-   **PDF.js:** Library for PDF text extraction.
-   **JSZip:** Library for handling .zip archives, used in PPTX processing.
-   **React Query (TanStack Query):** Data fetching, caching, and state management for server data.
-   **Zustand:** Lightweight state management for specific local state (e.g., flashcard context).
-   **Tailwind CSS:** Utility-first CSS framework for styling.
-   **Radix UI:** Headless UI components.
-   **Lucide Icons:** Icon library.
-   **Recharts:** Charting library for data visualization.
-   **TanStack Router:** Type-safe routing.
-   **Framer Motion:** Animation library.
-   **TipTap Editor:** Rich text editor.

## Environment Setup
The application requires three environment variables to be configured:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `VITE_OPENROUTER_API_KEY` - Your OpenRouter API key for AI features

**Platform-Agnostic Configuration**: 
The app uses `import.meta.env.VITE_*` which works on ANY platform:
- **Replit**: Add variables in Replit Secrets
- **Netlify**: Add variables in Netlify Environment Variables dashboard
- **Vercel**: Add variables in Vercel Environment Variables
- **Local Development**: Create a `.env` file (not committed to git)

No code changes needed when switching platforms - just configure the environment variables in your deployment platform's dashboard.

## Deployment Notes
This application is ready to deploy on multiple platforms:
- **Replit**: Already configured with workflow on port 5000
- **Netlify**: Run `npm run build`, deploy the `dist` folder, add environment variables
- **Vercel**: Deploy directly from GitHub, add environment variables
- **Static Hosting**: Build with `npm run build`, serve the `dist` folder

Build Command: `npm run build`
Output Directory: `dist`

## Recent Changes (November 2, 2025)
### Critical Fixes Implemented
- **FREE YouTube Transcript API**: Replaced RapidAPI (required paid key) with completely free supadata.ai API that works without any API key
- **Progress Tracking Fixed**: Added simulated incremental progress updates during AI generation to prevent getting stuck at 10% - now properly shows 10% → 90% during generation
- **Anki Export Removed**: Cleaned up FlashcardManager by removing the unused "Export for Anki" button and TSV export functionality
- **Robust PDF Export Utility Created**: Implemented professional PDF export system using `marked` library for proper markdown rendering:
  - **Lesson PDF Export**: Beautiful formatting with headers, code blocks, lists, blockquotes, all properly styled
  - **Quiz PDF Export**: Formatted questions with highlighted correct answers and explanations
  - **Flashcard PDF Export**: Printable side-by-side front/back layout for effective studying
- **Dependencies Added**: Installed `marked` library for robust markdown-to-HTML conversion

## Previous Changes (November 1, 2025)
- **CRITICAL FIX: Infinite Loading Bug**: Fixed authentication infinite loading issue by adding comprehensive error handling in AuthContext. Now properly handles session errors, profile creation failures, and ensures loading state is always set to false.
- **Chunked AI Processing**: Implemented intelligent content chunking for large documents:
  - Created `textChunking.ts` utility with smart paragraph/sentence boundary detection
  - AI requests now split into 4000-character chunks with 200-char overlap for context preservation
  - Automatic merging of results with duplicate removal
  - Supports documents of any size without content truncation
- **Progress Tracking System**: Added comprehensive progress indicators:
  - Created `ProgressIndicator.tsx` component with animated progress bars
  - Real-time progress updates during AI generation (0-100%)
  - Detailed status messages for each processing stage
  - Beautiful gradient animations and shimmer effects
- **Enhanced Lesson Generation**: Significantly improved AI-generated lessons:
  - Added rich markdown formatting instructions (bold, code blocks, blockquotes, lists)
  - Better structure with clear sections and examples
  - No more 6000-character limit - processes full document content
  - Improved lesson quality with detailed prompts for each difficulty level
- **Better Quiz & Flashcard Generation**: Enhanced quiz and flashcard creation:
  - Added difficulty levels to quiz questions (beginner/intermediate/advanced)
  - Chunked processing for large documents
  - Better hint generation for flashcards
  - Progress tracking for all AI operations

## Previous Changes (October 30, 2025)
- **Fixed Dark Mode Visibility**: Systematically replaced ALL hardcoded light theme colors (text-slate-*, bg-white, light gradients) with theme-aware CSS variables (text-foreground, glass-card, bg-muted) throughout entire codebase for perfect visibility on dark backgrounds
- **Enhanced UI Components**: Added gradient buttons, glass-morphism effects, smooth animations throughout Lesson, Quiz, and Flashcard managers
- **Improved Scrollbar Styling**: Custom beautiful scrollbars in sidebar with smooth animations and hover effects
- **Platform-Agnostic Environment Variables**: Configured to work seamlessly on Replit, Netlify, Vercel, or any platform
- **Netlify Deployment Ready**: Created comprehensive deployment guide with placeholder credentials for secure deployment
- **Security**: Removed hardcoded secrets from documentation, using environment-based configuration only
- **GitHub Import Setup**: Successfully configured project for Replit environment with all dependencies installed.
- **Environment Variables**: Configured Supabase (URL, ANON_KEY) and OpenRouter (API_KEY) credentials via Replit Secrets.
- **Workflow Configuration**: Set up dev server on port 5000 with proper HMR and proxy settings for Replit.
- **Deployment Configuration**: Configured autoscale deployment for production with build and preview commands.
- **Enhanced Sidebar Navigation**: Completely redesigned sidebar with professional styling including:
  - Enhanced glass-morphism effects with backdrop blur
  - Smooth 500ms transitions with ease-out easing
  - Beautiful gradient backgrounds on active navigation items
  - Scale animations and hover effects on all buttons
  - Active indicator lines with gradient shadows
  - Section dividers with elegant gradient lines
  - Custom scrollbar styling with primary color theme
  - Professional typography and spacing improvements
  - Settings button with matching enhanced style