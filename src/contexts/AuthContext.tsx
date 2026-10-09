'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'ADMIN' | 'SUPER_ADMIN';

export interface User {
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

// Preset Credentials
export const PRESET_USERS = {
  admin: {
    email: 'admin@merabetta.com',
    passwords: ['Admin@123', 'admin123'],
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

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEY);
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error('Error loading session from localStorage:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string, keepMeSignedIn: boolean) => {
    // Artificial small delay for realistic authentication experience
    await new Promise((resolve) => setTimeout(resolve, 600));

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Check Admin
    if (
      cleanEmail === PRESET_USERS.admin.email.toLowerCase() &&
      PRESET_USERS.admin.passwords.includes(cleanPassword)
    ) {
      const loggedUser: User = {
        email: PRESET_USERS.admin.email,
        name: PRESET_USERS.admin.name,
        role: PRESET_USERS.admin.role,
      };
      setUser(loggedUser);
      if (keepMeSignedIn) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedUser));
      } else {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(loggedUser));
      }
      return { success: true };
    }

    // Check Super Admin
    if (
      cleanEmail === PRESET_USERS.superadmin.email.toLowerCase() &&
      PRESET_USERS.superadmin.passwords.includes(cleanPassword)
    ) {
      const loggedUser: User = {
        email: PRESET_USERS.superadmin.email,
        name: PRESET_USERS.superadmin.name,
        role: PRESET_USERS.superadmin.role,
      };
      setUser(loggedUser);
      if (keepMeSignedIn) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedUser));
      } else {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(loggedUser));
      }
      return { success: true };
    }

    return {
      success: false,
      error: 'Invalid email or password. Please check your credentials.',
    };
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Error clearing storage:', e);
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
