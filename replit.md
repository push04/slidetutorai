# SlideTutor AI - AI-Powered Learning Platform

## Overview
SlideTutor AI is a production-ready learning platform that transforms educational content into interactive lessons, quizzes, and flashcards using AI. It features a modern, dark-mode-only UI and provides a comprehensive and engaging learning experience. The project emphasizes gamification, robust security, and a scalable architecture to support a rich set of learning activities and user interactions, aiming to be a completely free platform.

## Recent Changes (November 2025)

### AI Coach Enhancements
- **Expanded Language Support:** Now supports 15 languages (English, Hindi, Spanish, French, German, Chinese, Japanese, Korean, Arabic, Portuguese, Russian, Italian, Turkish, Polish, Dutch)
- **Enhanced AI Models:** Updated OpenRouter integration to use 10+ free AI models with automatic fallback (LLaMA 3.3 70B, DeepSeek R1, Gemini 2.0 Flash, Qwen 2.5 72B, etc.)
- **Markdown Rendering:** Added full markdown support with syntax highlighting for code blocks using ReactMarkdown and rehype-highlight
- **Conversation Persistence:** Implemented localStorage-based conversation history that survives page refreshes
- **Improved UX:** 
  - Gentle microphone permission requests with friendly error messages
  - Streaming responses with real-time markdown rendering
  - Enhanced loading states with animated indicators
  - Export conversation functionality

### Investor Panel Improvements
- **Netlify Forms Integration:** Fixed form submission to properly work with Netlify Forms for payment confirmations
- **Hidden form elements:** Added proper form detection in index.html for build-time form recognition

### UI/UX Enhancements
- **Ultra-Professional Scrollbars:** Beautiful gradient scrollbars with glow effects and smooth animations
- **Deployment Configuration:** Set up autoscale deployment with proper build and preview commands
- **Better Error Handling:** User-friendly error messages throughout the application

### Technical Improvements
- **Code Quality:** Fixed TypeScript/LSP issues and removed unused imports
- **Performance:** Optimized conversation history management
- **Accessibility:** Improved permission request flows and user feedback

## User Preferences
I prefer simple language and clear explanations. I want iterative development with frequent, small updates rather than large, infrequent ones. Please ask before making any major architectural changes or introducing new dependencies. I prefer to be involved in decisions regarding UI/UX, especially color schemes and design patterns.

## System Architecture
The application features a modern, dark-mode-only UI with glass morphism effects and gradient animations. It employs a responsive design and prioritizes accessibility. The architecture supports AI-powered content generation, adaptive learning, and gamification.

**Technical Implementations:**
-   **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Custom CSS Variables
-   **State Management:** React Query, Zustand, React Context, useState
-   **Authentication:** Supabase Auth (mandatory, RLS enabled, social auth)
-   **Database:** Supabase (PostgreSQL) with a comprehensive schema (23+ tables)
-   **AI:** OpenRouter API (GPT-4, Claude, etc.) for content generation and Q&A.
-   **File Processing:** PDF.js for PDF text extraction, JSZip for PPTX.
-   **UI Components:** Radix UI, Lucide Icons, TipTap Editor (Rich Text), Recharts (Charts), Framer Motion (Animations).
-   **Routing:** TanStack Router

**Feature Specifications:**
-   **AI-Powered Content:** Generate lessons, quizzes, and flashcards from uploaded PDF/PPTX files. Includes advanced chunking and anti-hallucination systems for large documents.
-   **Adaptive Learning:** Quizzes with multiple question types, explanations, and adaptive difficulty. Spaced repetition (SM-2 algorithm) for flashcards.
-   **Gamification:** XP, levels, streaks, achievements (4 tiers, 5 categories), and leaderboards.
-   **Content Management:** File uploads, bookmarks, custom tags, rich text notes, task manager, habit tracker.
-   **User Engagement:** Chat Q&A with AI, goals tracking, analytics dashboard, global search.
-   **Security:** Mandatory Supabase authentication, Row Level Security, secure sessions.
-   **Export:** Robust PDF export for lessons, quizzes, and flashcards.
-   **Persistence:** Persistent storage using IndexedDB for uploads, lessons, quiz progress, and flashcard study.

**System Design Choices:**
-   **UI/UX:** Dark mode, glass morphism, gradient animations, responsive, accessible design. Enhanced scrollbars and professional sidebar navigation.
-   **Database:** Supabase (PostgreSQL) with a highly normalized and performant schema.
-   **Modularity:** Clear code organization (`components`, `contexts`, `hooks`, `lib`, `services`, `types`).
-   **Deployment:** Configured for Replit and compatible with static hosting services like Netlify and Vercel.
-   **AI Coach:** Professional AI Coach with 10+ free AI models, 15-language support, real-time streaming responses, markdown rendering with syntax highlighting, conversation persistence, voice recognition, text-to-speech, and comprehensive learning features.

## External Dependencies
-   **Supabase:** Database (PostgreSQL), Authentication, Realtime features.
-   **OpenRouter API:** AI model integration (GPT-4, Claude, etc.) for content generation and chat.
-   **PDF.js:** Library for PDF text extraction.
-   **JSZip:** Library for handling .zip archives (PPTX processing).
-   **React Query (TanStack Query):** Data fetching, caching, and server state management.
-   **Zustand:** Lightweight state management.
-   **Tailwind CSS:** Utility-first CSS framework.
-   **Radix UI:** Headless UI components.
-   **Lucide Icons:** Icon library.
-   **Recharts:** Charting library.
-   **TanStack Router:** Type-safe routing.
-   **Framer Motion:** Animation library.
-   **TipTap Editor:** Rich text editor.
-   **marked:** Markdown parser for PDF export.
-   **supadata.ai:** Free YouTube Transcript API.