'use client';

import type { User } from '@/lib/schemas';
import { useRouter } from 'next/navigation';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// For prototype purposes, we'll store the user in localStorage.
// In a real app, you'd use secure, httpOnly cookies with a session token.
const FAKE_SESSION_KEY = 'codepilot_session';

interface AuthContextType {
  user: Omit<User, 'password'> | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Omit<User, 'password'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Mock server-side users list for login check
  const mockLoginCheck = (email: string, password_input: string): Omit<User, 'password'> | null => {
    if (email === 'admin@example.com' && password_input === 'password') {
        return { id: '1', email: 'admin@example.com', role: 'admin' };
    }
    if (email === 'user@example.com' && password_input === 'password') {
        return { id: '2', email: 'user@example.com', role: 'user' };
    }
    return null;
  };

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

  const login = async (email: string, password: string) => {
    const foundUser = mockLoginCheck(email, password);
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem(FAKE_SESSION_KEY, JSON.stringify(foundUser));
      return { success: true };
    }
    return { success: false, message: 'Invalid email or password' };
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
