import React, { createContext, useEffect, useState } from 'react';
import { storage } from '../lib/storage';

export interface LocalUser {
  id: string;
  name: string;
  createdAt: string;
}

export interface AuthContextType {
  user: LocalUser | null;
  session: { user: LocalUser } | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [session, setSession] = useState<{ user: LocalUser } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load or create local user profile
    const initUser = async () => {
      try {
        const profile: any = await storage.getProfile();
        
        if (profile) {
          const localUser: LocalUser = {
            id: profile.id,
            name: profile.name || profile.full_name || 'Student',
            createdAt: profile.createdAt || new Date().toISOString(),
          };
          setUser(localUser);
          setSession({ user: localUser });
        } else {
          // Create default profile
          const newProfile = {
            id: 'default-profile',
            name: 'Student',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            xp: 0,
            level: 1,
            streak: 0,
          };
          await storage.setProfile(newProfile);
          
          const localUser: LocalUser = {
            id: newProfile.id,
            name: newProfile.name,
            createdAt: newProfile.createdAt,
          };
          setUser(localUser);
          setSession({ user: localUser });
        }
      } catch (error) {
        console.error('Error initializing user:', error);
      } finally {
        setLoading(false);
      }
    };

    initUser();
  }, []);

  const signIn = async (_email: string, _password: string) => {
    // No-op for local storage mode - always "signed in"
    return Promise.resolve();
  };

  const signUp = async (_email: string, _password: string, fullName: string) => {
    // Update profile name
    const profile: any = await storage.getProfile();
    if (profile) {
      await storage.setProfile({ ...profile, name: fullName, full_name: fullName });
      const localUser: LocalUser = {
        id: profile.id,
        name: fullName,
        createdAt: profile.createdAt,
      };
      setUser(localUser);
      setSession({ user: localUser });
    }
  };

  const signOut = async () => {
    // No-op for local storage mode - always "signed in"
    return Promise.resolve();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
