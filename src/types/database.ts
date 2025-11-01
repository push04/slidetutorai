// Complete TypeScript types for Supabase Database Schema
// This file mirrors the schema defined in supabase/schema.sql

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          language_preference: string;
          timezone: string;
          total_xp: number;
          current_level: number;
          current_streak: number;
          longest_streak: number;
          last_study_date: string | null;
          notifications_enabled: boolean;
          email_notifications: boolean;
          study_reminders: boolean;
          openrouter_api_key_encrypted: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          language_preference?: string;
          timezone?: string;
          total_xp?: number;
          current_level?: number;
          current_streak?: number;
          longest_streak?: number;
          last_study_date?: string | null;
          notifications_enabled?: boolean;
          email_notifications?: boolean;
          study_reminders?: boolean;
          openrouter_api_key_encrypted?: string | null;
        };
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
      };
      uploads: {
        Row: {
          id: string;
          user_id: string;
          filename: string;
          original_filename: string;
          file_size: number;
          mime_type: string;
          storage_path: string;
          status: 'processing' | 'completed' | 'failed';
          processed: boolean;
          indexed: boolean;
          slide_count: number;
          full_text: string | null;
          metadata: Record<string, any>;
          error_message: string | null;
          version: number;
          parent_upload_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['uploads']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['uploads']['Insert']>;
      };
      lessons: {
        Row: {
          id: string;
          user_id: string;
          upload_id: string | null;
          title: string;
          content: string;
          description: string | null;
          difficulty: 'beginner' | 'intermediate' | 'advanced';
          estimated_minutes: number;
          status: 'draft' | 'published' | 'archived';
          tags: string[];
          metadata: Record<string, any>;
          view_count: number;
          completion_count: number;
          favorite_count: number;
          is_public: boolean;
          shared_with_groups: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['lessons']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['lessons']['Insert']>;
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string | null;
          upload_id: string | null;
          title: string;
          content: string;
          content_html: string | null;
          tags: string[];
          color: string;
          pinned: boolean;
          position_data: Record<string, any> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notes']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['notes']['Insert']>;
      };
      flashcard_decks: {
        Row: {
          id: string;
          user_id: string;
          upload_id: string | null;
          lesson_id: string | null;
          name: string;
          description: string | null;
          tags: string[];
          color: string;
          is_public: boolean;
          shared_with_groups: string[];
          total_cards: number;
          cards_due_count: number;
          mastered_cards_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['flashcard_decks']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['flashcard_decks']['Insert']>;
      };
      flashcards: {
        Row: {
          id: string;
          deck_id: string;
          front: string;
          back: string;
          hint: string | null;
          difficulty: number;
          interval: number;
          repetitions: number;
          ease_factor: number;
          next_review: string;
          last_reviewed: string | null;
          total_reviews: number;
          correct_reviews: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['flashcards']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['flashcards']['Insert']>;
      };
      quiz_sessions: {
        Row: {
          id: string;
          user_id: string;
          upload_id: string | null;
          lesson_id: string | null;
          title: string;
          difficulty: 'beginner' | 'intermediate' | 'advanced' | null;
          total_questions: number;
          correct_answers: number;
          score: number | null;
          time_spent_seconds: number;
          status: 'in_progress' | 'completed' | 'abandoned';
          started_at: string;
          completed_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['quiz_sessions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['quiz_sessions']['Insert']>;
      };
      quiz_questions: {
        Row: {
          id: string;
          session_id: string;
          question: string;
          options: any;
          correct_index: number;
          explanation: string | null;
          user_answer: number | null;
          is_correct: boolean | null;
          time_spent_seconds: number;
          flagged: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['quiz_questions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['quiz_questions']['Insert']>;
      };
      chat_conversations: {
        Row: {
          id: string;
          user_id: string;
          upload_id: string | null;
          title: string;
          context_summary: string | null;
          message_count: number;
          last_message_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['chat_conversations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['chat_conversations']['Insert']>;
      };
      chat_messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: 'user' | 'assistant';
          content: string;
          model: string | null;
          tokens_used: number | null;
          metadata: Record<string, any>;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['chat_messages']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['chat_messages']['Insert']>;
      };
      study_sessions: {
        Row: {
          id: string;
          user_id: string;
          activity_type: 'lesson' | 'quiz' | 'flashcard' | 'chat' | 'note';
          resource_id: string | null;
          duration_seconds: number;
          started_at: string;
          ended_at: string;
          performance_score: number | null;
          items_completed: number | null;
          items_correct: number | null;
          tags: string[];
          metadata: Record<string, any>;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['study_sessions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['study_sessions']['Insert']>;
      };
      user_streaks: {
        Row: {
          id: string;
          user_id: string;
          streak_date: string;
          minutes_studied: number;
          xp_earned: number;
          activities_completed: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_streaks']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['user_streaks']['Insert']>;
      };
      achievements: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string;
          icon: string;
          category: 'streak' | 'mastery' | 'social' | 'milestone' | 'special';
          tier: 'bronze' | 'silver' | 'gold' | 'platinum';
          requirement_type: string;
          requirement_value: number;
          xp_reward: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['achievements']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['achievements']['Insert']>;
      };
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_id: string;
          unlocked_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_achievements']['Row'], 'id' | 'unlocked_at'>;
        Update: Partial<Database['public']['Tables']['user_achievements']['Insert']>;
      };
      study_groups: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string | null;
          avatar_url: string | null;
          is_public: boolean;
          max_members: number;
          allow_member_invites: boolean;
          member_count: number;
          total_study_time: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['study_groups']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['study_groups']['Insert']>;
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'member';
          joined_at: string;
          contribution_score: number;
        };
        Insert: Omit<Database['public']['Tables']['group_members']['Row'], 'id' | 'joined_at'>;
        Update: Partial<Database['public']['Tables']['group_members']['Insert']>;
      };
      bookmarks: {
        Row: {
          id: string;
          user_id: string;
          resource_type: 'lesson' | 'flashcard_deck' | 'quiz' | 'note' | 'upload';
          resource_id: string;
          folder: string | null;
          tags: string[];
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['bookmarks']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['bookmarks']['Insert']>;
      };
      user_tags: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          icon: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_tags']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['user_tags']['Insert']>;
      };
      study_recommendations: {
        Row: {
          id: string;
          user_id: string;
          recommendation_type: 'review_flashcards' | 'weak_topics' | 'new_lesson' | 'practice_quiz' | 'group_join';
          resource_type: string | null;
          resource_id: string | null;
          title: string;
          description: string;
          priority: number;
          reason: string | null;
          dismissed: boolean;
          completed: boolean;
          completed_at: string | null;
          created_at: string;
          expires_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['study_recommendations']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['study_recommendations']['Insert']>;
      };
      user_goals: {
        Row: {
          id: string;
          user_id: string;
          goal_type: 'daily_minutes' | 'weekly_lessons' | 'card_mastery' | 'streak' | 'custom';
          title: string;
          description: string | null;
          target_value: number;
          current_value: number;
          unit: string;
          start_date: string;
          end_date: string | null;
          status: 'active' | 'completed' | 'abandoned';
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_goals']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_goals']['Insert']>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: 'study_reminder' | 'achievement' | 'group_invite' | 'streak_warning' | 'goal_progress' | 'system';
          title: string;
          message: string;
          action_url: string | null;
          action_label: string | null;
          read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
      leaderboard_entries: {
        Row: {
          id: string;
          user_id: string;
          period: 'daily' | 'weekly' | 'monthly' | 'all_time';
          category: 'xp' | 'streak' | 'study_time' | 'mastery';
          score: number;
          rank: number | null;
          period_start: string;
          period_end: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['leaderboard_entries']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['leaderboard_entries']['Insert']>;
      };
      shared_content: {
        Row: {
          id: string;
          owner_id: string;
          resource_type: 'lesson' | 'flashcard_deck' | 'quiz' | 'note';
          resource_id: string;
          share_code: string;
          title: string;
          description: string | null;
          is_public: boolean;
          requires_password: boolean;
          password_hash: string | null;
          max_uses: number | null;
          current_uses: number;
          expires_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['shared_content']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['shared_content']['Insert']>;
      };
    };
    Functions: {
      update_user_xp: {
        Args: { p_user_id: string; p_xp_gained: number };
        Returns: void;
      };
      update_user_streak: {
        Args: { p_user_id: string };
        Returns: void;
      };
    };
  };
};
