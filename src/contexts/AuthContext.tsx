import React, { createContext, useContext, useState, useEffect } from 'react';
import { Customer, Admin } from '@/types';
import { customerAPI, adminAPI } from '@/lib/api';
import { toast } from 'sonner';

interface AuthContextType {
  user: Customer | Admin | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  adminLogin: (adminId: number, password: string) => Promise<void>;
  signup: (data: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Customer | Admin | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('user');
    const savedIsAdmin = localStorage.getItem('is_admin') === 'true';

    // Defensive parse: localStorage may contain the string 'undefined' or invalid JSON
    let parsedUser: Customer | Admin | null = null;
    if (savedUser && savedUser !== 'undefined') {
      try {
        parsedUser = JSON.parse(savedUser);
      } catch (err) {
        // Corrupt value — remove it so subsequent loads are clean
        console.warn('AuthContext: failed to parse saved user, clearing localStorage user');
        localStorage.removeItem('user');
        parsedUser = null;
      }
    }

    if (token && parsedUser) {
      setUser(parsedUser);
      setIsAdmin(savedIsAdmin);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await customerAPI.login({ email_id: email, password });
      const data = response.data || {};
      const token = data.token;

      // Server returns flat fields (c_id, c_name, email_id, token). Normalize to a user object.
      const userData = data.user ?? {
        c_id: data.c_id,
        c_name: data.c_name,
        email_id: data.email_id,
      };

      // Safely store token and user to avoid writing the string 'undefined'
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }

      if (typeof userData !== 'undefined' && userData !== null) {
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData as any);
      } else {
        localStorage.removeItem('user');
        setUser(null);
      }

      localStorage.setItem('is_admin', 'false');
      setIsAdmin(false);
      toast.success('Login successful!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Login failed');
      throw error;
    }
  };

  const adminLogin = async (adminId: number, password: string) => {
    try {
      const response = await adminAPI.login({ admin_id: adminId, password });
      const data = response.data || {};
      const token = data.token;

      // Server returns { admin_id, token }
      const adminData = data.user ?? { admin_id: data.admin_id };

      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }

      if (typeof adminData !== 'undefined' && adminData !== null) {
        localStorage.setItem('user', JSON.stringify(adminData));
        setUser(adminData as any);
      } else {
        localStorage.removeItem('user');
        setUser(null);
      }

      localStorage.setItem('is_admin', 'true');
      setIsAdmin(true);
      toast.success('Admin login successful!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Admin login failed');
      throw error;
    }
  };

  const signup = async (data: any) => {
    try {
      const response = await customerAPI.signup(data);
      const resp = response.data || {};
      const token = resp.token;

      // Server returns { c_id, token } on signup. Build a local user object using signup data.
      const userData = resp.user ?? {
        c_id: resp.c_id,
        c_name: data.c_name,
        email_id: data.email_id,
        phone_no: data.phone_no,
        dob: data.dob || null,
      };

      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }

      if (typeof userData !== 'undefined' && userData !== null) {
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData as any);
      } else {
        localStorage.removeItem('user');
        setUser(null);
      }

      localStorage.setItem('is_admin', 'false');
      setIsAdmin(false);
      toast.success('Signup successful!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Signup failed');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('is_admin');
    setUser(null);
    setIsAdmin(false);
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, isLoading, login, adminLogin, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
