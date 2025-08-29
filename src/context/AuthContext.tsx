import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<boolean>;
  isLoading: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Mock users for demo
const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@hoffman.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'administrator',
    createdAt: new Date('2024-01-01'),
    lastLogin: new Date(),
    isActive: true,
  },
  {
    id: '2',
    email: 'doctor@hoffman.com',
    firstName: 'Dr. John',
    lastName: 'Smith',
    role: 'doctor',
    createdAt: new Date('2024-01-01'),
    lastLogin: new Date(),
    isActive: true,
  },
  {
    id: '3',
    email: 'patient@hoffman.com',
    firstName: 'Jane',
    lastName: 'Doe',
    role: 'patient',
    createdAt: new Date('2024-01-01'),
    lastLogin: new Date(),
    isActive: true,
  },
];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth token
    const storedUser = localStorage.getItem('hoffman_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Mock authentication
    const foundUser = mockUsers.find(u => u.email === email);
    if (foundUser && password === 'password') {
      setUser(foundUser);
      localStorage.setItem('hoffman_user', JSON.stringify(foundUser));
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('hoffman_user');
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    setIsLoading(true);
    
    // Mock registration
    const rawId = Date.now().toString();
    const generatedId = userData.role === 'patient' ? `patient-${rawId}` : rawId;

    const newUser: User = {
      id: generatedId,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      createdAt: new Date(),
      isActive: true,
    };
    
    mockUsers.push(newUser);
    setUser(newUser);
    localStorage.setItem('hoffman_user', JSON.stringify(newUser));
    setIsLoading(false);
    return true;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};