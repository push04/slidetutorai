# SlideTutor AI - Learning Platform

An intelligent learning platform with AI-powered lesson generation, quizzes, flashcards, and more.

## Features
- 🤖 AI-powered lesson generation from uploaded content
- 📝 Interactive quizzes with difficulty levels
- 🎴 Smart flashcards with spaced repetition
- 💬 AI tutor chat interface
- 📊 Learning analytics dashboard
- 🎮 Gamification with XP and achievements
- 👥 Social learning features

## Setup

### Environment Variables
This app requires three environment variables:

```bash
VITE_OPENROUTER_API_KEY=your_api_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Local Development
1. Copy `.env.example` to `.env`
2. Fill in your API credentials
3. Run `npm install`
4. Run `npm run dev`

### Netlify Deployment
**Do NOT commit API keys to the repository.**

Instead, add environment variables in Netlify:
1. Go to **Site settings** → **Build & deploy** → **Environment variables**
2. Add the three `VITE_*` variables listed above
3. Trigger a new deployment

The build command is: `npm run build`
The publish directory is: `dist`

## Tech Stack
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Supabase (Auth + Database)
- OpenRouter AI
- TipTap Editor
- Recharts
