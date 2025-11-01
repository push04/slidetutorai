-- =====================================================
-- SlideTutor AI - Complete Database Schema
-- Production-Ready Supabase Schema
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search

-- =====================================================
-- 1. USER PROFILES & SETTINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    language_preference TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',
    
    -- XP & Gamification
    total_xp INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_study_date DATE,
    
    -- Settings (Dark Mode Only)
    notifications_enabled BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    study_reminders BOOLEAN DEFAULT true,
    
    -- Encrypted API Key Storage
    openrouter_api_key_encrypted TEXT, -- Encrypted using Supabase Vault
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_xp ON user_profiles(total_xp DESC);

-- =====================================================
-- 2. FILE UPLOADS & VERSIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL, -- Path in Supabase Storage
    
    -- Processing metadata
    status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    processed BOOLEAN DEFAULT false,
    indexed BOOLEAN DEFAULT false,
    slide_count INTEGER DEFAULT 0,
    full_text TEXT, -- Extracted text content
    metadata JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    
    -- Version tracking
    version INTEGER DEFAULT 1,
    parent_upload_id UUID REFERENCES uploads(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_uploads_user_id ON uploads(user_id, created_at DESC);
CREATE INDEX idx_uploads_status ON uploads(status);
CREATE INDEX idx_uploads_parent ON uploads(parent_upload_id);
CREATE INDEX idx_uploads_fulltext ON uploads USING gin(to_tsvector('english', full_text));

-- =====================================================
-- 3. LESSONS
-- =====================================================

CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    upload_id UUID REFERENCES uploads(id) ON DELETE SET NULL,
    
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    description TEXT,
    difficulty TEXT DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    estimated_minutes INTEGER DEFAULT 15,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    
    -- Metadata
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Statistics
    view_count INTEGER DEFAULT 0,
    completion_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    
    -- Sharing
    is_public BOOLEAN DEFAULT false,
    shared_with_groups UUID[],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lessons_user_id ON lessons(user_id, created_at DESC);
CREATE INDEX idx_lessons_upload_id ON lessons(upload_id);
CREATE INDEX idx_lessons_status ON lessons(status);
CREATE INDEX idx_lessons_difficulty ON lessons(difficulty);
CREATE INDEX idx_lessons_tags ON lessons USING gin(tags);
CREATE INDEX idx_lessons_public ON lessons(is_public) WHERE is_public = true;
CREATE INDEX idx_lessons_search ON lessons USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || content));

-- =====================================================
-- 4. NOTES
-- =====================================================

CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    upload_id UUID REFERENCES uploads(id) ON DELETE SET NULL,
    
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_html TEXT, -- Rich text HTML
    
    -- Organization
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    color TEXT DEFAULT '#6366f1', -- Hex color for organization
    pinned BOOLEAN DEFAULT false,
    
    -- Positioning (for inline annotations)
    position_data JSONB, -- { page, x, y, context } for PDF annotations
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_user_id ON notes(user_id, created_at DESC);
CREATE INDEX idx_notes_lesson_id ON notes(lesson_id);
CREATE INDEX idx_notes_upload_id ON notes(upload_id);
CREATE INDEX idx_notes_pinned ON notes(user_id, pinned DESC);
CREATE INDEX idx_notes_search ON notes USING gin(to_tsvector('english', title || ' ' || content));

-- =====================================================
-- 5. FLASHCARD DECKS & CARDS
-- =====================================================

CREATE TABLE IF NOT EXISTS flashcard_decks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    upload_id UUID REFERENCES uploads(id) ON DELETE SET NULL,
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    
    name TEXT NOT NULL,
    description TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    color TEXT DEFAULT '#8b5cf6',
    
    -- Sharing
    is_public BOOLEAN DEFAULT false,
    shared_with_groups UUID[],
    
    -- Statistics
    total_cards INTEGER DEFAULT 0,
    cards_due_count INTEGER DEFAULT 0,
    mastered_cards_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flashcards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deck_id UUID NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
    
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    hint TEXT,
    
    -- SM-2 Algorithm fields
    difficulty INTEGER DEFAULT 0,
    interval INTEGER DEFAULT 0,
    repetitions INTEGER DEFAULT 0,
    ease_factor DECIMAL(3,2) DEFAULT 2.50,
    next_review TIMESTAMPTZ DEFAULT NOW(),
    last_reviewed TIMESTAMPTZ,
    
    -- Statistics
    total_reviews INTEGER DEFAULT 0,
    correct_reviews INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_flashcard_decks_user_id ON flashcard_decks(user_id, created_at DESC);
CREATE INDEX idx_flashcard_decks_public ON flashcard_decks(is_public) WHERE is_public = true;
CREATE INDEX idx_flashcards_deck_id ON flashcards(deck_id);
CREATE INDEX idx_flashcards_next_review ON flashcards(deck_id, next_review);

-- =====================================================
-- 6. QUIZZES & SESSIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS quiz_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    upload_id UUID REFERENCES uploads(id) ON DELETE SET NULL,
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    
    title TEXT NOT NULL,
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    
    -- Session data
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER DEFAULT 0,
    score DECIMAL(5,2), -- Percentage
    time_spent_seconds INTEGER DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of options
    correct_index INTEGER NOT NULL,
    explanation TEXT,
    
    -- User response
    user_answer INTEGER,
    is_correct BOOLEAN,
    time_spent_seconds INTEGER DEFAULT 0,
    flagged BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quiz_sessions_user_id ON quiz_sessions(user_id, created_at DESC);
CREATE INDEX idx_quiz_sessions_status ON quiz_sessions(status);
CREATE INDEX idx_quiz_questions_session_id ON quiz_questions(session_id);

-- =====================================================
-- 7. CHAT CONVERSATIONS & MESSAGES
-- =====================================================

CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    upload_id UUID REFERENCES uploads(id) ON DELETE SET NULL,
    
    title TEXT NOT NULL,
    context_summary TEXT,
    
    -- Statistics
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    
    -- Metadata
    model TEXT,
    tokens_used INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_conversations_user_id ON chat_conversations(user_id, last_message_at DESC);
CREATE INDEX idx_chat_messages_conversation_id ON chat_messages(conversation_id, created_at);

-- =====================================================
-- 8. STUDY SESSIONS & ANALYTICS
-- =====================================================

CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    activity_type TEXT NOT NULL CHECK (activity_type IN ('lesson', 'quiz', 'flashcard', 'chat', 'note')),
    resource_id UUID, -- ID of the lesson, quiz, etc.
    
    -- Time tracking
    duration_seconds INTEGER NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ NOT NULL,
    
    -- Performance metrics
    performance_score DECIMAL(5,2), -- 0-100
    items_completed INTEGER,
    items_correct INTEGER,
    
    -- Context
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_study_sessions_user_id ON study_sessions(user_id, started_at DESC);
CREATE INDEX idx_study_sessions_type ON study_sessions(activity_type);
CREATE INDEX idx_study_sessions_date ON study_sessions(user_id, DATE(started_at));

-- =====================================================
-- 9. STREAKS & ACHIEVEMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS user_streaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    streak_date DATE NOT NULL,
    minutes_studied INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    activities_completed INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, streak_date)
);

CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('streak', 'mastery', 'social', 'milestone', 'special')),
    tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
    
    -- Unlock criteria
    requirement_type TEXT NOT NULL,
    requirement_value INTEGER NOT NULL,
    xp_reward INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_streaks_user_date ON user_streaks(user_id, streak_date DESC);
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id, unlocked_at DESC);

-- =====================================================
-- 10. STUDY GROUPS & COLLABORATION
-- =====================================================

CREATE TABLE IF NOT EXISTS study_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    description TEXT,
    avatar_url TEXT,
    
    -- Settings
    is_public BOOLEAN DEFAULT false,
    max_members INTEGER DEFAULT 50,
    allow_member_invites BOOLEAN DEFAULT true,
    
    -- Statistics
    member_count INTEGER DEFAULT 1,
    total_study_time INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Statistics
    contribution_score INTEGER DEFAULT 0,
    
    UNIQUE(group_id, user_id)
);

CREATE INDEX idx_study_groups_public ON study_groups(is_public) WHERE is_public = true;
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);

-- =====================================================
-- 11. BOOKMARKS & FAVORITES
-- =====================================================

CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    resource_type TEXT NOT NULL CHECK (resource_type IN ('lesson', 'flashcard_deck', 'quiz', 'note', 'upload')),
    resource_id UUID NOT NULL,
    
    -- Organization
    folder TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, resource_type, resource_id)
);

CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id, created_at DESC);
CREATE INDEX idx_bookmarks_resource ON bookmarks(resource_type, resource_id);

-- =====================================================
-- 12. TAGS & ORGANIZATION
-- =====================================================

CREATE TABLE IF NOT EXISTS user_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6366f1',
    icon TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, name)
);

CREATE INDEX idx_user_tags_user_id ON user_tags(user_id);

-- =====================================================
-- 13. STUDY RECOMMENDATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS study_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('review_flashcards', 'weak_topics', 'new_lesson', 'practice_quiz', 'group_join')),
    resource_type TEXT,
    resource_id UUID,
    
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority INTEGER DEFAULT 5, -- 1-10
    reason TEXT, -- AI-generated explanation
    
    -- Status
    dismissed BOOLEAN DEFAULT false,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX idx_study_recommendations_user_id ON study_recommendations(user_id, priority DESC, created_at DESC);
CREATE INDEX idx_study_recommendations_active ON study_recommendations(user_id) WHERE NOT dismissed AND NOT completed;

-- =====================================================
-- 14. GOALS & MILESTONES
-- =====================================================

CREATE TABLE IF NOT EXISTS user_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    goal_type TEXT NOT NULL CHECK (goal_type IN ('daily_minutes', 'weekly_lessons', 'card_mastery', 'streak', 'custom')),
    title TEXT NOT NULL,
    description TEXT,
    
    -- Target
    target_value INTEGER NOT NULL,
    current_value INTEGER DEFAULT 0,
    unit TEXT NOT NULL, -- 'minutes', 'lessons', 'cards', 'days'
    
    -- Timeline
    start_date DATE NOT NULL,
    end_date DATE,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_goals_user_id ON user_goals(user_id, status, created_at DESC);

-- =====================================================
-- 15. NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    type TEXT NOT NULL CHECK (type IN ('study_reminder', 'achievement', 'group_invite', 'streak_warning', 'goal_progress', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Action
    action_url TEXT,
    action_label TEXT,
    
    -- Status
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id, read, created_at DESC);

-- =====================================================
-- 16. LEADERBOARDS
-- =====================================================

CREATE TABLE IF NOT EXISTS leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'all_time')),
    category TEXT NOT NULL CHECK (category IN ('xp', 'streak', 'study_time', 'mastery')),
    
    score INTEGER NOT NULL,
    rank INTEGER,
    
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, period, category, period_start)
);

CREATE INDEX idx_leaderboard_entries_ranking ON leaderboard_entries(period, category, period_start, score DESC);

-- =====================================================
-- 17. SHARED CONTENT
-- =====================================================

CREATE TABLE IF NOT EXISTS shared_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    resource_type TEXT NOT NULL CHECK (resource_type IN ('lesson', 'flashcard_deck', 'quiz', 'note')),
    resource_id UUID NOT NULL,
    
    share_code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    
    -- Access control
    is_public BOOLEAN DEFAULT true,
    requires_password BOOLEAN DEFAULT false,
    password_hash TEXT,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(resource_type, resource_id)
);

CREATE INDEX idx_shared_content_code ON shared_content(share_code);
CREATE INDEX idx_shared_content_owner ON shared_content(owner_id);
CREATE INDEX idx_shared_content_public ON shared_content(is_public) WHERE is_public = true;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_content ENABLE ROW LEVEL SECURITY;

-- User Profiles: Users can only view and update their own profile
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Uploads: Users can only access their own uploads
CREATE POLICY "Users can view own uploads" ON uploads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own uploads" ON uploads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own uploads" ON uploads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own uploads" ON uploads FOR DELETE USING (auth.uid() = user_id);

-- Lessons: Users can view own lessons or public/shared lessons
CREATE POLICY "Users can view own lessons" ON lessons FOR SELECT USING (
    auth.uid() = user_id OR 
    is_public = true OR 
    auth.uid() = ANY(SELECT user_id FROM group_members WHERE group_id = ANY(shared_with_groups))
);
CREATE POLICY "Users can insert own lessons" ON lessons FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lessons" ON lessons FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own lessons" ON lessons FOR DELETE USING (auth.uid() = user_id);

-- Notes: Users can only access their own notes
CREATE POLICY "Users can view own notes" ON notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes" ON notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON notes FOR DELETE USING (auth.uid() = user_id);

-- Flashcard Decks: Users can view own decks or public/shared decks
CREATE POLICY "Users can view accessible flashcard decks" ON flashcard_decks FOR SELECT USING (
    auth.uid() = user_id OR 
    is_public = true OR 
    auth.uid() = ANY(SELECT user_id FROM group_members WHERE group_id = ANY(shared_with_groups))
);
CREATE POLICY "Users can insert own flashcard decks" ON flashcard_decks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own flashcard decks" ON flashcard_decks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own flashcard decks" ON flashcard_decks FOR DELETE USING (auth.uid() = user_id);

-- Flashcards: Users can view cards from accessible decks
CREATE POLICY "Users can view accessible flashcards" ON flashcards FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM flashcard_decks 
        WHERE id = deck_id AND (
            user_id = auth.uid() OR 
            is_public = true OR 
            auth.uid() = ANY(SELECT user_id FROM group_members WHERE group_id = ANY(shared_with_groups))
        )
    )
);
CREATE POLICY "Users can insert flashcards in own decks" ON flashcards FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM flashcard_decks WHERE id = deck_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update flashcards in own decks" ON flashcards FOR UPDATE USING (
    EXISTS (SELECT 1 FROM flashcard_decks WHERE id = deck_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete flashcards in own decks" ON flashcards FOR DELETE USING (
    EXISTS (SELECT 1 FROM flashcard_decks WHERE id = deck_id AND user_id = auth.uid())
);

-- Quiz Sessions: Users can only access their own quiz sessions
CREATE POLICY "Users can view own quiz sessions" ON quiz_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quiz sessions" ON quiz_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quiz sessions" ON quiz_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own quiz sessions" ON quiz_sessions FOR DELETE USING (auth.uid() = user_id);

-- Quiz Questions: Users can view questions from their own sessions
CREATE POLICY "Users can view own quiz questions" ON quiz_questions FOR SELECT USING (
    EXISTS (SELECT 1 FROM quiz_sessions WHERE id = session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert quiz questions in own sessions" ON quiz_questions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM quiz_sessions WHERE id = session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update quiz questions in own sessions" ON quiz_questions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM quiz_sessions WHERE id = session_id AND user_id = auth.uid())
);

-- Chat Conversations & Messages: Users can only access their own chats
CREATE POLICY "Users can view own chat conversations" ON chat_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chat conversations" ON chat_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chat conversations" ON chat_conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own chat conversations" ON chat_conversations FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own chat messages" ON chat_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM chat_conversations WHERE id = conversation_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert chat messages in own conversations" ON chat_messages FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM chat_conversations WHERE id = conversation_id AND user_id = auth.uid())
);

-- Study Sessions: Users can only access their own sessions
CREATE POLICY "Users can view own study sessions" ON study_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own study sessions" ON study_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Streaks: Users can only access their own streaks
CREATE POLICY "Users can view own streaks" ON user_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own streaks" ON user_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own streaks" ON user_streaks FOR UPDATE USING (auth.uid() = user_id);

-- Achievements: Everyone can view all achievements
CREATE POLICY "Everyone can view achievements" ON achievements FOR SELECT USING (true);

-- User Achievements: Users can view own achievements
CREATE POLICY "Users can view own achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert user achievements" ON user_achievements FOR INSERT WITH CHECK (true);

-- Study Groups: Users can view public groups or groups they're members of
CREATE POLICY "Users can view accessible study groups" ON study_groups FOR SELECT USING (
    is_public = true OR 
    auth.uid() = owner_id OR 
    EXISTS (SELECT 1 FROM group_members WHERE group_id = id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert own study groups" ON study_groups FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update own study groups" ON study_groups FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete own study groups" ON study_groups FOR DELETE USING (auth.uid() = owner_id);

-- Group Members: Users can view members of accessible groups
CREATE POLICY "Users can view accessible group members" ON group_members FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM study_groups 
        WHERE id = group_id AND (
            is_public = true OR 
            auth.uid() = owner_id OR 
            EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = id AND gm.user_id = auth.uid())
        )
    )
);
CREATE POLICY "Users can join groups" ON group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave groups" ON group_members FOR DELETE USING (auth.uid() = user_id);

-- Bookmarks: Users can only access their own bookmarks
CREATE POLICY "Users can view own bookmarks" ON bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bookmarks" ON bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bookmarks" ON bookmarks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bookmarks" ON bookmarks FOR DELETE USING (auth.uid() = user_id);

-- User Tags: Users can only access their own tags
CREATE POLICY "Users can view own tags" ON user_tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tags" ON user_tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tags" ON user_tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tags" ON user_tags FOR DELETE USING (auth.uid() = user_id);

-- Study Recommendations: Users can only access their own recommendations
CREATE POLICY "Users can view own recommendations" ON study_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert recommendations" ON study_recommendations FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own recommendations" ON study_recommendations FOR UPDATE USING (auth.uid() = user_id);

-- User Goals: Users can only access their own goals
CREATE POLICY "Users can view own goals" ON user_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON user_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON user_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON user_goals FOR DELETE USING (auth.uid() = user_id);

-- Notifications: Users can only access their own notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON notifications FOR DELETE USING (auth.uid() = user_id);

-- Leaderboard Entries: Users can view all leaderboard entries
CREATE POLICY "Users can view leaderboard entries" ON leaderboard_entries FOR SELECT USING (true);
CREATE POLICY "System can manage leaderboard entries" ON leaderboard_entries FOR ALL USING (true);

-- Shared Content: Users can view public shared content or content they own
CREATE POLICY "Users can view accessible shared content" ON shared_content FOR SELECT USING (
    is_public = true OR auth.uid() = owner_id
);
CREATE POLICY "Users can insert own shared content" ON shared_content FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own shared content" ON shared_content FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own shared content" ON shared_content FOR DELETE USING (auth.uid() = owner_id);

-- =====================================================
-- TRIGGER FOR AUTO-CREATING USER PROFILES
-- =====================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_uploads_updated_at BEFORE UPDATE ON uploads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_flashcard_decks_updated_at BEFORE UPDATE ON flashcard_decks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON flashcards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_conversations_updated_at BEFORE UPDATE ON chat_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_study_groups_updated_at BEFORE UPDATE ON study_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_goals_updated_at BEFORE UPDATE ON user_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leaderboard_entries_updated_at BEFORE UPDATE ON leaderboard_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA: DEFAULT ACHIEVEMENTS
-- =====================================================

INSERT INTO achievements (code, name, description, icon, category, tier, requirement_type, requirement_value, xp_reward) VALUES
-- Streak Achievements
('streak_3', 'Getting Started', 'Study for 3 days in a row', '🔥', 'streak', 'bronze', 'streak_days', 3, 50),
('streak_7', 'Week Warrior', 'Study for 7 days in a row', '⚡', 'streak', 'silver', 'streak_days', 7, 150),
('streak_30', 'Monthly Master', 'Study for 30 days in a row', '🌟', 'streak', 'gold', 'streak_days', 30, 500),
('streak_100', 'Century Club', 'Study for 100 days in a row', '💎', 'streak', 'platinum', 'streak_days', 100, 2000),

-- Mastery Achievements
('cards_50', 'Card Collector', 'Master 50 flashcards', '🎴', 'mastery', 'bronze', 'cards_mastered', 50, 75),
('cards_200', 'Memory Master', 'Master 200 flashcards', '🧠', 'mastery', 'silver', 'cards_mastered', 200, 250),
('cards_500', 'Knowledge Keeper', 'Master 500 flashcards', '📚', 'mastery', 'gold', 'cards_mastered', 500, 750),
('cards_1000', 'Supreme Scholar', 'Master 1000 flashcards', '👑', 'mastery', 'platinum', 'cards_mastered', 1000, 2500),

-- Study Time Achievements
('time_10h', 'Dedicated Learner', 'Study for 10 hours total', '⏰', 'milestone', 'bronze', 'minutes_studied', 600, 100),
('time_50h', 'Committed Student', 'Study for 50 hours total', '📖', 'milestone', 'silver', 'minutes_studied', 3000, 300),
('time_100h', 'Learning Legend', 'Study for 100 hours total', '🏆', 'milestone', 'gold', 'minutes_studied', 6000, 800),
('time_500h', 'Master of Knowledge', 'Study for 500 hours total', '🎓', 'milestone', 'platinum', 'minutes_studied', 30000, 3000),

-- Social Achievements
('group_join', 'Team Player', 'Join your first study group', '👥', 'social', 'bronze', 'groups_joined', 1, 50),
('group_create', 'Leader', 'Create your first study group', '🎯', 'social', 'silver', 'groups_created', 1, 100),
('shared_content', 'Content Creator', 'Share your first lesson or deck', '✨', 'social', 'gold', 'content_shared', 1, 150)

ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- FUNCTIONS FOR ANALYTICS & GAMIFICATION
-- =====================================================

-- Function to update user XP and level
CREATE OR REPLACE FUNCTION update_user_xp(p_user_id UUID, p_xp_gained INTEGER)
RETURNS void AS $$
DECLARE
    new_xp INTEGER;
    new_level INTEGER;
BEGIN
    UPDATE user_profiles 
    SET total_xp = total_xp + p_xp_gained
    WHERE id = p_user_id
    RETURNING total_xp INTO new_xp;
    
    -- Calculate new level (100 XP per level, increasing by 10% each level)
    new_level := FLOOR(1 + SQRT(1 + 8 * new_xp / 100) / 2);
    
    UPDATE user_profiles 
    SET current_level = new_level
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and update streak
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
    last_study DATE;
    today DATE := CURRENT_DATE;
    new_streak INTEGER;
BEGIN
    SELECT last_study_date INTO last_study
    FROM user_profiles
    WHERE id = p_user_id;
    
    IF last_study IS NULL THEN
        -- First study session
        new_streak := 1;
    ELSIF last_study = today THEN
        -- Already studied today, no change
        RETURN;
    ELSIF last_study = today - 1 THEN
        -- Studied yesterday, increment streak
        SELECT current_streak + 1 INTO new_streak
        FROM user_profiles
        WHERE id = p_user_id;
    ELSE
        -- Streak broken, reset to 1
        new_streak := 1;
    END IF;
    
    UPDATE user_profiles
    SET 
        current_streak = new_streak,
        longest_streak = GREATEST(longest_streak, new_streak),
        last_study_date = today
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- END OF SCHEMA
-- =====================================================
