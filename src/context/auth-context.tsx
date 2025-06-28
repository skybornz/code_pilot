'use client';

import type { User } from '@/lib/schemas';
import { useRouter } from 'next/navigation';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser } from '@/actions/users';

// For prototype purposes, we'll store the user in localStorage.
// In a real app, you'd use secure, httpOnly cookies with a session token.
const FAKE_SESSION_KEY = 'codepilot_session';

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
    try {
      const session = localStorage.getItem(FAKE_SESSION_KEY);
      if (session) {
        setUser(JSON.parse(session));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem(FAKE_SESSION_KEY);
    } finally {
        setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password_input: string) => {
    const result = await loginUser({ email, password: password_input });
    if (result.success && result.user) {
      setUser(result.user);
      localStorage.setItem(FAKE_SESSION_KEY, JSON.stringify(result.user));
      return { success: true, user: result.user };
    }
    return { success: false, message: result.message };
  };

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(FAKE_SESSION_KEY);
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
