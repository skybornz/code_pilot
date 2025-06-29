'use client';

import type { User } from '@/lib/schemas';
import { useRouter } from 'next/navigation';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { loginUser, getUserById } from '@/actions/users';
import { useToast } from '@/hooks/use-toast';

const SESSION_STORAGE_KEY = 'semco_pilot_session';
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes

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
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const logout = useCallback((isTimeout = false) => {
    setUser(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
    if (isTimeout) {
        toast({
            title: "Session Expired",
            description: "You have been logged out due to inactivity.",
        });
    }
    router.push('/login');
  }, [router, toast]);


  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
    inactivityTimer.current = setTimeout(() => {
      logout(true);
    }, INACTIVITY_TIMEOUT_MS);
  }, [logout]);


  useEffect(() => {
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll'];

    if (!!user) {
        resetInactivityTimer();
        activityEvents.forEach(event => {
            window.addEventListener(event, resetInactivityTimer);
        });
    }

    return () => {
        if (inactivityTimer.current) {
            clearTimeout(inactivityTimer.current);
        }
        activityEvents.forEach(event => {
            window.removeEventListener(event, resetInactivityTimer);
        });
    };
  }, [user, resetInactivityTimer]);

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

  return (
    <AuthContext.Provider value={{ 
        user, 
        isAuthenticated: !!user, 
        isAdmin: user?.role === 'admin',
        login, 
        logout: () => logout(false),
        isLoading,
    }}>
      {children}
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
