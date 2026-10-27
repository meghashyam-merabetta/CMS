'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginAdmin, logoutAdmin, getMe } from '@/services/api/adminAuthApi';

export type UserRole = 'ADMIN' | 'SUPER_ADMIN';

export interface User {
  id?: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, keepMeSignedIn: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Preset Credentials for quick 1-click testing
export const PRESET_USERS = {
  admin: {
    email: 'admin@example.com',
    passwords: [
      process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD || 'Admin@123456',
      'Admin@123',
      'admin123',
    ],
    name: 'Admin User',
    role: 'ADMIN' as UserRole,
  },
  superadmin: {
    email: 'superadmin@merabetta.com',
    passwords: ['SuperAdmin@123', 'superadmin123'],
    name: 'Super Admin',
    role: 'SUPER_ADMIN' as UserRole,
  },
};

const STORAGE_KEY = 'merabetta_crm_auth_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check active session on mount
  useEffect(() => {
    async function restoreSession() {
      try {
        const savedUser =
          localStorage.getItem(STORAGE_KEY) ||
          sessionStorage.getItem(STORAGE_KEY);
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
        const res = await getMe();
        if (res?.user) {
          const verifiedUser: User = {
            id: res.user.id,
            email: res.user.email,
            name: res.user.name || 'Admin User',
            role: res.user.email.toLowerCase().includes('super')
              ? 'SUPER_ADMIN'
              : 'ADMIN',
          };
          setUser(verifiedUser);
        }
      } catch {
        // If cookie is expired or missing, clear stale local user
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  const login = async (email: string, password: string, keepMeSignedIn: boolean) => {
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    try {
      // 1. Call Backend Login API
      const loginRes = await loginAdmin(cleanEmail, cleanPassword);

      const userSource = loginRes?.user;

      const loggedUser: User = {
        id: userSource?.id,
        email: userSource?.email || cleanEmail,
        name: userSource?.name || 'Admin User',
        role: (userSource?.email || cleanEmail).toLowerCase().includes('super')
          ? 'SUPER_ADMIN'
          : 'ADMIN',
      };

      setUser(loggedUser);
      if (keepMeSignedIn) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedUser));
      } else {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(loggedUser));
      }

      return { success: true };
    } catch (err: any) {
      console.warn('Backend login failed:', err?.message);
      return {
        success: false,
        error: err?.message || 'Login failed. Please check your connection or credentials.',
      };
    }
  };

  const logout = async () => {
    try {
      await logoutAdmin();
    } catch (e) {
      console.warn('Logout API failed:', e);
    } finally {
      setUser(null);
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
