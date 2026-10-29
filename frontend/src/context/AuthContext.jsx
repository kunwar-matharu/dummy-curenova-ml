import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

const normalizeUser = (u) => {
  if (!u) return null;
  return {
    ...u,
    name: u.full_name || u.name || u.email || 'Clinical User',
    role: u.role || 'patient',
    approval_status: u.approval_status || 'approved',
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('curenova_token'));
  const [loading, setLoading] = useState(true);

  // Seeded production/testing accounts in CureNova backend database
  const demoAccounts = {
    researcher: {
      email: 'dr.elena.vance@curenova-research.org',
      password: 'CureNova2026!Secure',
      role: 'researcher',
      name: 'Dr. Elena Vance, PhD',
    },
    doctor: {
      email: 'marcus.chen.md@metropolitan-health.org',
      password: 'CureNova2026!Secure',
      role: 'doctor',
      name: 'Dr. Marcus Chen, MD',
    },
    patient: {
      email: 'sarah.jenkins@patient-portal.org',
      password: 'CureNova2026!Secure',
      role: 'patient',
      name: 'Sarah Jenkins',
    },
  };

  const refreshProfile = useCallback(async () => {
    try {
      const liveUser = await authService.getMe();
      const normalized = normalizeUser(liveUser);
      localStorage.setItem('curenova_user', JSON.stringify(normalized));
      setUser(normalized);
      return normalized;
    } catch (e) {
      if (e.message && e.message.toLowerCase().includes('expired')) {
        logout();
      }
      return null;
    }
  }, []);

  const logout = async () => {
    const refreshToken = localStorage.getItem('curenova_refresh_token');
    try {
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } catch (e) {
      console.warn('Backend logout notification skipped:', e.message);
    } finally {
      localStorage.removeItem('curenova_token');
      localStorage.removeItem('curenova_refresh_token');
      localStorage.removeItem('curenova_user');
      setToken(null);
      setUser(null);
    }
  };

  useEffect(() => {
    const handleTokenRefreshed = (e) => {
      const newToken = e.detail?.access_token;
      if (newToken) {
        setToken(newToken);
      }
    };

    const handleSessionExpired = () => {
      localStorage.removeItem('curenova_token');
      localStorage.removeItem('curenova_refresh_token');
      localStorage.removeItem('curenova_user');
      setToken(null);
      setUser(null);
    };

    window.addEventListener('curenova:token_refreshed', handleTokenRefreshed);
    window.addEventListener('curenova:session_expired', handleSessionExpired);

    return () => {
      window.removeEventListener('curenova:token_refreshed', handleTokenRefreshed);
      window.removeEventListener('curenova:session_expired', handleSessionExpired);
    };
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('curenova_user');
    const savedToken = localStorage.getItem('curenova_token');

    if (savedUser && savedToken) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(normalizeUser(parsed));
        setToken(savedToken);
        authService.getMe()
          .then((liveUser) => {
            const normalized = normalizeUser(liveUser);
            localStorage.setItem('curenova_user', JSON.stringify(normalized));
            setUser(normalized);
          })
          .catch((err) => {
            console.warn('Session verification notice:', err.message);
          });
      } catch (e) {
        localStorage.removeItem('curenova_user');
        localStorage.removeItem('curenova_token');
        localStorage.removeItem('curenova_refresh_token');
        setUser(null);
        setToken(null);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  const login = async (email, password, role) => {
    const res = await authService.login(email, password, role);
    const normalized = normalizeUser(res.user);

    if (res.access_token) {
      localStorage.setItem('curenova_token', res.access_token);
      setToken(res.access_token);
    }
    if (res.refresh_token) {
      localStorage.setItem('curenova_refresh_token', res.refresh_token);
    }
    localStorage.setItem('curenova_user', JSON.stringify(normalized));
    setUser(normalized);
    return normalized;
  };

  const register = async (userData) => {
    const registeredUser = await authService.register(userData);
    try {
      const loginRes = await authService.login(userData.email, userData.password);
      const normalized = normalizeUser(loginRes.user);
      if (loginRes.access_token) {
        localStorage.setItem('curenova_token', loginRes.access_token);
        setToken(loginRes.access_token);
      }
      if (loginRes.refresh_token) {
        localStorage.setItem('curenova_refresh_token', loginRes.refresh_token);
      }
      localStorage.setItem('curenova_user', JSON.stringify(normalized));
      setUser(normalized);
      return normalized;
    } catch {
      const normalized = normalizeUser(registeredUser);
      localStorage.setItem('curenova_user', JSON.stringify(normalized));
      setUser(normalized);
      return normalized;
    }
  };

  const switchRole = async (targetRole) => {
    const target = demoAccounts[targetRole] || demoAccounts.doctor;
    try {
      return await login(target.email, target.password, target.role);
    } catch {
      const mockUser = {
        id: `usr-${targetRole}-001`,
        name: target.name,
        email: target.email,
        role: target.role,
        organization: targetRole === 'doctor' ? 'Mount Sinai Hospital' : targetRole === 'researcher' ? 'Broad Institute of MIT & Harvard' : 'Patient / Caregiver',
        approval_status: 'approved',
      };
      const mockToken = `mock-jwt-token-${targetRole}`;
      localStorage.setItem('curenova_token', mockToken);
      localStorage.setItem('curenova_user', JSON.stringify(mockUser));
      setToken(mockToken);
      setUser(mockUser);
      return mockUser;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        switchRole,
        demoLogin: switchRole,
        refreshProfile,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
