import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (identifier: string, password: string) => Promise<User | null>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<boolean>;
  refreshProfile: () => Promise<User | null>;
  validateToken: () => Promise<boolean>;
  updateProfile: (data: UpdateProfileInput) => Promise<User | null>;
  changePassword: (data: ChangePasswordInput) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<string | null>;
  confirmPasswordReset: (input: PasswordResetConfirmationInput) => Promise<boolean>;
  isLoading: boolean;
  getDashboardPath: (role: UserRole) => string;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  nationalId?: string | null;
  insuranceNumber?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  contactPhone?: string | null;
}

interface UpdateProfileInput {
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string | null;
}

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

interface PasswordResetConfirmationInput {
  email: string;
  code: string;
  newPassword: string;
  token: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'hoffmann_user';
const TOKEN_STORAGE_KEY = 'hoffmann_token';
const TOKEN_EXP_STORAGE_KEY = 'hoffmann_token_exp';
const LEGACY_USER_STORAGE_KEY = 'hoffman_user';
const LEGACY_TOKEN_STORAGE_KEY = 'hoffman_token';
const LEGACY_TOKEN_EXP_STORAGE_KEY = 'hoffman_token_exp';

const normalizeRole = (role: string | null | undefined): UserRole => {
  const value = (role ?? '').toString().trim().toLowerCase();
  if (['administrator', 'admin', 'administrador'].includes(value)) return 'administrator';
  if (['patient', 'paciente', 'usuario', 'user', 'usuarios'].includes(value)) return 'patient';
  if (['student', 'estudiante'].includes(value)) return 'student';
  if (['therapist', 'terapeuta'].includes(value)) return 'therapist';
  if (['coach'].includes(value)) return 'coach';
  if (['trainer'].includes(value)) return 'trainer';
  return 'doctor';
};

const hydrateUser = (payload: any): User => {
  return {
    id: payload?.id?.toString?.() ?? '',
    username: payload?.username ?? '',
    email: payload?.email ?? '',
    firstName: payload?.firstName ?? '',
    lastName: payload?.lastName ?? '',
    role: normalizeRole(payload?.role),
    avatar: payload?.avatar ?? undefined,
    createdAt: payload?.createdAt ? new Date(payload.createdAt) : new Date(),
    lastLogin: payload?.lastLogin ? new Date(payload.lastLogin) : undefined,
    isActive: typeof payload?.isActive === 'boolean' ? payload.isActive : Boolean(payload?.isActive ?? true),
  };
};

const serializeUser = (user: User) => JSON.stringify({
  ...user,
  createdAt: user.createdAt?.toISOString?.() ?? null,
  lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
});

const parseExpiresIn = (expiresIn: unknown): number => {
  if (typeof expiresIn === 'number') {
    return expiresIn >= 1e6 ? expiresIn : expiresIn * 1000;
  }

  if (typeof expiresIn !== 'string') {
    return 3600 * 1000;
  }

  const trimmed = expiresIn.trim().toLowerCase();
  const match = trimmed.match(/^(\d+)(ms|s|m|h|d)?$/);
  if (!match) return 3600 * 1000;

  const value = parseInt(match[1], 10);
  const unit = match[2] ?? 's';

  switch (unit) {
    case 'ms':
      return value;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 's':
    default:
      return value * 1000;
  }
};

const tokenIsExpired = (expiresAtRaw: string | null): boolean => {
  if (!expiresAtRaw) return false;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt)) {
    return false;
  }
  return expiresAt <= Date.now();
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const apiBase = (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3000';

  const getDashboardPath = useCallback((role: UserRole) => {
    if (role === 'administrator') return '/dashboard/admin';
    if (role === 'patient' || role === 'student') return '/dashboard/patient';
    return '/dashboard/doctor';
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXP_STORAGE_KEY);
    localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
    localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
    localStorage.removeItem(LEGACY_TOKEN_EXP_STORAGE_KEY);
  }, []);

  const saveSession = useCallback((nextUser: User, accessToken: string, expiresIn?: unknown) => {
    setUser(nextUser);
    setToken(accessToken);
    localStorage.setItem(USER_STORAGE_KEY, serializeUser(nextUser));
    localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
    localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
    localStorage.removeItem(LEGACY_TOKEN_EXP_STORAGE_KEY);

    if (expiresIn !== undefined && expiresIn !== null) {
      const expiresMs = parseExpiresIn(expiresIn);
      const expiresAt = Date.now() + expiresMs;
      localStorage.setItem(TOKEN_EXP_STORAGE_KEY, expiresAt.toString());
    }
  }, []);

  const login = useCallback(async (identifier: string, password: string): Promise<User | null> => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier, password }),
      });

      if (!res.ok) {
        throw new Error(`Login failed with status ${res.status}`);
      }

      const data = await res.json();
      if (!data?.accessToken || !data?.user) {
        throw new Error('Login response malformed');
      }

      const mappedUser = hydrateUser(data.user);
      saveSession(mappedUser, data.accessToken, data.expiresIn);
      return mappedUser;
    } catch (error) {
      console.error('Login failed', error);
      clearSession();
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiBase, clearSession, saveSession]);

  const validateToken = useCallback(async (): Promise<boolean> => {
    const activeToken = token ?? localStorage.getItem(TOKEN_STORAGE_KEY);
    const expiresAtRaw = localStorage.getItem(TOKEN_EXP_STORAGE_KEY);

    if (!activeToken || tokenIsExpired(expiresAtRaw)) {
      clearSession();
      return false;
    }

    try {
      const res = await fetch(`${apiBase}/auth/validate`, {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Token validation failed with status ${res.status}`);
      }

      const data = await res.json();
      const mappedUser = hydrateUser(data?.user ?? data);
      saveSession(mappedUser, activeToken);
      return true;
    } catch (error) {
      console.error('Token validation failed', error);
      clearSession();
      return false;
    }
  }, [apiBase, token, clearSession, saveSession]);

  const refreshProfile = useCallback(async (): Promise<User | null> => {
    const activeToken = token ?? localStorage.getItem(TOKEN_STORAGE_KEY);
    const expiresAtRaw = localStorage.getItem(TOKEN_EXP_STORAGE_KEY);

    if (!activeToken || tokenIsExpired(expiresAtRaw)) {
      clearSession();
      return null;
    }

    try {
      const res = await fetch(`${apiBase}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Profile request failed with status ${res.status}`);
      }

      const data = await res.json();
      const mappedUser = hydrateUser(data);
      saveSession(mappedUser, activeToken);
      return mappedUser;
    } catch (error) {
      console.error('Profile refresh failed', error);
      clearSession();
      return null;
    }
  }, [apiBase, token, clearSession, saveSession]);

  const updateProfile = useCallback(
    async (profileData: UpdateProfileInput): Promise<User | null> => {
      const activeToken = token ?? localStorage.getItem(TOKEN_STORAGE_KEY);

      if (!activeToken) {
        throw new Error('No hay una sesión activa');
      }

      try {
        const res = await fetch(`${apiBase}/auth/profile`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeToken}`,
          },
          body: JSON.stringify(profileData),
        });

        if (!res.ok) {
          if (res.status === 401) {
            clearSession();
          }

          const errBody = await res.json().catch(() => null);
          const message = errBody?.message ?? 'No se pudo actualizar el perfil';
          const formatted = Array.isArray(message) ? message.join(', ') : message;
          throw new Error(formatted);
        }

        const data = await res.json();
        const mappedUser = hydrateUser(data);
        saveSession(mappedUser, activeToken);
        return mappedUser;
      } catch (error) {
        console.error('Profile update failed', error);
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('No se pudo actualizar el perfil');
      }
    },
    [apiBase, token, saveSession, clearSession],
  );

  const changePassword = useCallback(
    async (passwords: ChangePasswordInput): Promise<boolean> => {
      const activeToken = token ?? localStorage.getItem(TOKEN_STORAGE_KEY);

      if (!activeToken) {
        throw new Error('No hay una sesión activa');
      }

      try {
        const res = await fetch(`${apiBase}/auth/password`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeToken}`,
          },
          body: JSON.stringify(passwords),
        });

        if (!res.ok) {
          if (res.status === 401) {
            clearSession();
          }

          const errBody = await res.json().catch(() => null);
          const message = errBody?.message ?? 'No se pudo actualizar la contraseña';
          const formatted = Array.isArray(message) ? message.join(', ') : message;
          throw new Error(formatted);
        }

        await res.json().catch(() => null);
        return true;
      } catch (error) {
        console.error('Password change failed', error);
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('No se pudo actualizar la contraseña');
      }
    },
    [apiBase, token, clearSession],
  );

  const requestPasswordReset = useCallback(
    async (email: string): Promise<string | null> => {
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        throw new Error('Debes proporcionar un correo electrónico');
      }

      try {
        const res = await fetch(`${apiBase}/auth/forgot-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: trimmedEmail }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => null);
          const message = errBody?.message ?? 'No se pudo enviar el código de verificación';
          const formatted = Array.isArray(message) ? message.join(', ') : message;
          throw new Error(formatted);
        }

        const data = await res.json().catch(() => null);
        return data?.token ?? null;
      } catch (error) {
        console.error('Password reset request failed', error);
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('No se pudo enviar el código de verificación');
      }
    },
    [apiBase],
  );

  const confirmPasswordReset = useCallback(
    async (input: PasswordResetConfirmationInput): Promise<boolean> => {
      const payload = {
        email: input.email.trim(),
        code: input.code.trim(),
        newPassword: input.newPassword.trim(),
        token: input.token.trim(),
      };

      if (!payload.email || !payload.code || !payload.newPassword || !payload.token) {
        throw new Error('Completa el correo, el código, el token y la nueva contraseña');
      }

      try {
        const res = await fetch(`${apiBase}/auth/forgot-password/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => null);
          const message = errBody?.message ?? 'No se pudo actualizar la contraseña';
          const formatted = Array.isArray(message) ? message.join(', ') : message;
          throw new Error(formatted);
        }

        await res.json().catch(() => null);
        return true;
      } catch (error) {
        console.error('Password reset confirmation failed', error);
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('No se pudo actualizar la contraseña');
      }
    },
    [apiBase],
  );

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const register = useCallback(
    async (userData: RegisterData): Promise<boolean> => {
      setIsLoading(true);
      try {
        const res = await fetch(`${apiBase}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: userData.email,
            password: userData.password,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role,
            nationalId: userData.nationalId,
            insuranceNumber: userData.insuranceNumber,
            birthDate: userData.birthDate,
            gender: userData.gender,
            contactPhone: userData.contactPhone,
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => null);
          const message = errBody?.message ?? `Registration failed with status ${res.status}`;
          throw new Error(Array.isArray(message) ? message.join(', ') : message);
        }

        const data = await res.json();
        if (!data?.accessToken || !data?.user) {
          throw new Error('Respuesta de registro inválida');
        }

        const mappedUser = hydrateUser(data.user);
        saveSession(mappedUser, data.accessToken, data.expiresIn);
        return true;
      } catch (error) {
        console.error('Registration failed', error);
        clearSession();
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [apiBase, saveSession, clearSession],
  );

  useEffect(() => {
    let cancelled = false;

    const bootstrap = () => {
      const readWithMigration = (currentKey: string, legacyKey: string) => {
        const currentValue = localStorage.getItem(currentKey);
        if (currentValue !== null) {
          localStorage.removeItem(legacyKey);
          return currentValue;
        }

        const legacyValue = localStorage.getItem(legacyKey);
        if (legacyValue !== null) {
          localStorage.setItem(currentKey, legacyValue);
          localStorage.removeItem(legacyKey);
        }

        return legacyValue;
      };

      const storedToken = readWithMigration(
        TOKEN_STORAGE_KEY,
        LEGACY_TOKEN_STORAGE_KEY,
      );
      const storedUserRaw = readWithMigration(
        USER_STORAGE_KEY,
        LEGACY_USER_STORAGE_KEY,
      );
      const expiresAtRaw = readWithMigration(
        TOKEN_EXP_STORAGE_KEY,
        LEGACY_TOKEN_EXP_STORAGE_KEY,
      );

      if (storedToken && tokenIsExpired(expiresAtRaw)) {
        clearSession();
        if (!cancelled) {
          setIsLoading(false);
        }
        return;
      }

      if (storedToken) {
        setToken(storedToken);
      }

      if (storedUserRaw) {
        try {
          const parsed = JSON.parse(storedUserRaw);
          const hydrated = hydrateUser(parsed);
          setUser(hydrated);
        } catch (error) {
          console.error('Failed to hydrate stored user', error);
          localStorage.removeItem(USER_STORAGE_KEY);
          localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
        }
      }

      if (!cancelled) {
        setIsLoading(false);
      }

      if (storedToken) {
        void validateToken();
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [clearSession, validateToken]);

  const value = useMemo(() => ({
    user,
    token,
    login,
    logout,
    register,
    refreshProfile,
    validateToken,
    updateProfile,
    changePassword,
    requestPasswordReset,
    confirmPasswordReset,
    isLoading,
    getDashboardPath,
  }), [
    user,
    token,
    login,
    logout,
    register,
    refreshProfile,
    validateToken,
    updateProfile,
    changePassword,
    requestPasswordReset,
    confirmPasswordReset,
    isLoading,
    getDashboardPath,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};