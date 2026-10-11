'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginAdmin, getMe, logoutAdmin } from '@/lib/api';

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
    passwords: [process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD || ''],
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
        // First try to verify with real backend session cookie
        const me = await getMe().catch(() => null);
        if (me && me.user) {
          const loggedUser: User = {
            id: me.user.id,
            email: me.user.email,
            name: me.user.name || 'Admin',
            role: 'ADMIN',
          };
          setUser(loggedUser);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedUser));
          return;
        }

        // Session invalid/expired on the server: drop any stale local copy
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(STORAGE_KEY);
        setUser(null);
      } catch (e) {
        console.error('Error loading session:', e);
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
      // 1. Try Live Backend Login API
      await loginAdmin(cleanEmail, cleanPassword);

      // Fetch user profile from /api/admin/auth/me
      const meData = await getMe().catch(() => null);
      const loggedUser: User = {
        id: meData?.user?.id,
        email: meData?.user?.email || cleanEmail,
        name: meData?.user?.name || 'Admin User',
        role: 'ADMIN',
      };

      setUser(loggedUser);
      if (keepMeSignedIn) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedUser));
      } else {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(loggedUser));
      }

      return { success: true };
    } catch (err: any) {
      console.warn('Backend login failed:', err.message);

      // 2. Fallback to Preset Credentials for offline development
      if (
        cleanEmail.toLowerCase() === PRESET_USERS.superadmin.email.toLowerCase() &&
        PRESET_USERS.superadmin.passwords.includes(cleanPassword)
      ) {
        const loggedUser: User = {
          email: PRESET_USERS.superadmin.email,
          name: PRESET_USERS.superadmin.name,
          role: 'SUPER_ADMIN',
        };
        setUser(loggedUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedUser));
        return { success: true };
      }

      return {
        success: false,
        error: err.message || 'Invalid email or password. Please check your credentials.',
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
