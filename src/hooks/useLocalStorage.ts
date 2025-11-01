// Custom hooks for local storage operations
// Replaces useSupabaseQuery hooks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storage } from '../lib/storage';

// Uploads
export function useUploads() {
  return useQuery({
    queryKey: ['uploads'],
    queryFn: () => storage.getUploads(),
  });
}

export function useCreateUpload() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => storage.createUpload(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploads'] });
    },
  });
}

export function useUpdateUpload() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => storage.updateUpload(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploads'] });
    },
  });
}

export function useDeleteUpload() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => storage.deleteUpload(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploads'] });
    },
  });
}

// Lessons
export function useLessons() {
  return useQuery({
    queryKey: ['lessons'],
    queryFn: () => storage.getLessons(),
  });
}

export function useCreateLesson() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => storage.createLesson(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
    },
  });
}

export function useUpdateLesson() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => storage.updateLesson(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
    },
  });
}

export function useDeleteLesson() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => storage.deleteLesson(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
    },
  });
}

// Quizzes
export function useQuizzes() {
  return useQuery({
    queryKey: ['quizzes'],
    queryFn: () => storage.getQuizzes(),
  });
}

export function useCreateQuiz() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => storage.createQuiz(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });
}

export function useUpdateQuiz() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => storage.updateQuiz(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });
}

export function useDeleteQuiz() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => storage.deleteQuiz(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });
}

// Flashcards
export function useFlashcards() {
  return useQuery({
    queryKey: ['flashcards'],
    queryFn: () => storage.getFlashcards(),
  });
}

export function useCreateFlashcard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => storage.createFlashcard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
    },
  });
}

export function useUpdateFlashcard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => storage.updateFlashcard(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
    },
  });
}

export function useDeleteFlashcard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => storage.deleteFlashcard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
    },
  });
}

// Chats
export function useChats() {
  return useQuery({
    queryKey: ['chats'],
    queryFn: () => storage.getChats(),
  });
}

export function useCreateChat() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => storage.createChat(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export function useUpdateChat() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => storage.updateChat(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export function useDeleteChat() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => storage.deleteChat(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

// Profile
export function useUserProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => storage.getProfile(),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => storage.setProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

// Goals
export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: () => storage.getGoals(),
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => storage.createGoal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => storage.updateGoal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => storage.deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

// Bookmarks
export function useBookmarks() {
  return useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => storage.getBookmarks(),
  });
}

export function useCreateBookmark() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => storage.createBookmark(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });
}

export function useDeleteBookmark() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => storage.deleteBookmark(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });
}

// Study Sessions
export function useStudySessions() {
  return useQuery({
    queryKey: ['study_sessions'],
    queryFn: () => storage.getStudySessions(),
  });
}

export function useCreateStudySession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => storage.createStudySession(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study_sessions'] });
    },
  });
}

// Tags
export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => storage.getTags(),
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => storage.createTag(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => storage.deleteTag(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}
