// frontend/src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('w4eh_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('w4eh_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await api.getMe();
          if (res.success && res.data) {
            setUser(res.data);
            localStorage.setItem('w4eh_user', JSON.stringify(res.data));
          }
        } catch (e) {
          console.warn('Session expired or invalid token');
          logout();
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (loginStr, password) => {
    const res = await api.login({ login: loginStr, password });
    if (res.success && res.data) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('w4eh_token', res.data.token);
      localStorage.setItem('w4eh_user', JSON.stringify(res.data.user));
      return res.data;
    }
    throw new Error(res.message || 'Login failed');
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    if (res.success && res.data) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('w4eh_token', res.data.token);
      localStorage.setItem('w4eh_user', JSON.stringify(res.data.user));
      return res.data;
    }
    throw new Error(res.message || 'Registration failed');
  };

  const logout = async () => {
    try {
      if (token) await api.logout();
    } catch {
      // Continue cleanup anyway
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('w4eh_token');
    localStorage.removeItem('w4eh_user');
  };

  const hasRole = (...roles) => {
    if (!user || !user.roles) return false;
    if (user.roles.includes('superadmin')) return true;
    return roles.some(r => user.roles.includes(r));
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      logout,
      hasRole,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
