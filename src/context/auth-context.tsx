'use client';

import type { User } from '@/lib/schemas';
import { useRouter } from 'next/navigation';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, getUserById } from '@/actions/users';
import { Loader2 } from 'lucide-react';

const SESSION_STORAGE_KEY = 'semco_pilot_session';

interface Session {
  userId: string;
}

interface AuthContextType {
  user: Omit<User, 'password'> | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string, user?: Omit<User, 'password'> }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Omit<User, 'password'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const sessionJson = localStorage.getItem(SESSION_STORAGE_KEY);
        if (sessionJson) {
          const session: Session = JSON.parse(sessionJson);
          const fetchedUser = await getUserById(session.userId);
          if (fetchedUser) {
            setUser(fetchedUser);
          } else {
            // User not found in DB, clear session
            localStorage.removeItem(SESSION_STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error("Failed to process session from localStorage", error);
        localStorage.removeItem(SESSION_STORAGE_KEY);
      } finally {
          setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = async (email: string, password_input: string) => {
    const result = await loginUser({ email, password: password_input });
    if (result.success && result.user) {
      setUser(result.user);
      const session: Session = { userId: result.user.id };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      return { success: true, user: result.user };
    }
    return { success: false, message: result.message };
  };

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ 
        user, 
        isAuthenticated: !!user, 
        isAdmin: user?.role === 'admin',
        login, 
        logout,
        isLoading,
    }}>
      {isLoading ? (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
