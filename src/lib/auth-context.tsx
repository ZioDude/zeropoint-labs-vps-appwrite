"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, logout as appwriteLogout, testSession, refreshSession } from './appwrite';

// Types
interface User {
  $id: string;
  name: string;
  email: string;
  emailVerification?: boolean;
  prefs?: Record<string, any>;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isDemoMode: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  setDemoMode: (enabled: boolean) => void;
  testAuthSession: () => Promise<any>;
  refreshAuthSession: () => Promise<User | null>;
}

// Demo user for demo mode
const DEMO_USER: User = {
  $id: 'demo-user',
  name: 'Demo User',
  email: 'demo@zeropoint.com',
  emailVerification: true
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      
      // Check if we're in demo mode (stored in localStorage)
      const demoMode = localStorage.getItem('demoMode') === 'true';
      if (demoMode) {
        setUser(DEMO_USER);
        setIsDemoMode(true);
        setIsLoading(false);
        return;
      }

      // Check for real Appwrite session
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser({
          $id: currentUser.$id,
          name: currentUser.name,
          email: currentUser.email,
          emailVerification: currentUser.emailVerification,
          prefs: currentUser.prefs
        });
        setIsDemoMode(false);
      } else {
        setUser(null);
        setIsDemoMode(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
      setIsDemoMode(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (userData: User) => {
    setUser(userData);
    setIsLoading(false);
  };

  const logout = async () => {
    try {
      if (isDemoMode) {
        // Demo mode logout
        localStorage.removeItem('demoMode');
        setIsDemoMode(false);
      } else {
        // Real Appwrite logout
        await appwriteLogout();
      }
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if logout fails
      setUser(null);
      setIsDemoMode(false);
      localStorage.removeItem('demoMode');
    }
  };

  const setDemoMode = (enabled: boolean) => {
    if (enabled) {
      localStorage.setItem('demoMode', 'true');
      setUser(DEMO_USER);
      setIsDemoMode(true);
    } else {
      localStorage.removeItem('demoMode');
      setUser(null);
      setIsDemoMode(false);
    }
  };

  // Test session establishment (for debugging)
  const testAuthSession = async () => {
    if (isDemoMode) {
      return { isDemoMode: true, user: DEMO_USER };
    }
    
    const sessionTest = await testSession();
    return {
      ...sessionTest,
      isDemoMode: false,
      contextUser: user ? { id: user.$id, email: user.email } : null
    };
  };

  // Refresh session (useful for OAuth flows)
  const refreshAuthSession = async () => {
    if (isDemoMode) {
      return DEMO_USER;
    }
    
    try {
      const refreshedUser = await refreshSession();
      if (refreshedUser) {
        const userData = {
          $id: refreshedUser.$id,
          name: refreshedUser.name,
          email: refreshedUser.email,
          emailVerification: refreshedUser.emailVerification,
          prefs: refreshedUser.prefs
        };
        setUser(userData);
        return userData;
      }
      return null;
    } catch (error) {
      console.error('Session refresh error:', error);
      return null;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isDemoMode,
    login,
    logout,
    setDemoMode,
    testAuthSession,
    refreshAuthSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 