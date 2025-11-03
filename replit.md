# SlideTutor AI - AI-Powered Learning Platform

## Overview
SlideTutor AI is a production-ready learning platform that transforms educational content into interactive lessons, quizzes, and flashcards using AI. It features a modern, dark-mode-only UI and provides a comprehensive and engaging learning experience. The project emphasizes gamification, robust security, and a scalable architecture to support a rich set of learning activities and user interactions, aiming to be a completely free platform.

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
-   **AI Coach:** Advanced AI Coach with multi-model fallback, always-on voice recognition, text-to-speech, conversation history, and general knowledge capabilities.

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