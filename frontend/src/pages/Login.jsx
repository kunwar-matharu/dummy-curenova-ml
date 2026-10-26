import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity,
  Stethoscope,
  Microscope,
  HeartHandshake,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const ROLES = [
  {
    role: 'researcher',
    label: 'Researcher',
    icon: Microscope,
    color: '#0284C7',
    darkColor: '#38BDF8',
    demoEmail: 'dr.elena.vance@curenova-research.org',
    demoPass: 'CureNova2026!Secure',
    demoName: 'Dr. Elena Vance',
  },
  {
    role: 'doctor',
    label: 'Doctor',
    icon: Stethoscope,
    color: '#0284C7',
    darkColor: '#60A5FA',
    demoEmail: 'marcus.chen.md@metropolitan-health.org',
    demoPass: 'CureNova2026!Secure',
    demoName: 'Dr. Marcus Chen',
  },
  {
    role: 'patient',
    label: 'Patient',
    icon: HeartHandshake,
    color: '#15803D',
    darkColor: '#34D399',
    demoEmail: 'sarah.jenkins@patient-portal.org',
    demoPass: 'CureNova2026!Secure',
    demoName: 'Sarah Jenkins',
  },
];

export const Login = () => {
  const { login } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRoleParam = searchParams.get('role');
  const validInitialRole = ROLES.some((r) => r.role === initialRoleParam) ? initialRoleParam : 'doctor';
  const initialMeta = ROLES.find((r) => r.role === validInitialRole) || ROLES[0];

  const [selectedRole, setSelectedRole] = useState(validInitialRole);
  const [email, setEmail] = useState(initialMeta.demoEmail);
  const [password, setPassword] = useState(initialMeta.demoPass);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const activeRoleMeta = ROLES.find((r) => r.role === selectedRole) || ROLES[0];
  const activeColor = isDark ? (activeRoleMeta.darkColor || activeRoleMeta.color) : activeRoleMeta.color;

  const handleRoleSelect = (roleKey) => {
    setSelectedRole(roleKey);
    const meta = ROLES.find((r) => r.role === roleKey);
    if (meta) {
      setEmail(meta.demoEmail);
      setPassword(meta.demoPass);
    }
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      navigate(`/${user.role}/dashboard`);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 bg-[var(--color-surface-ground)] transition-colors">
      {/* Back to Home Link */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
        <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
          CureNova Med-AI
        </span>
      </div>

      {/* Main Single Centered Login Card */}
      <div className="w-full max-w-md bg-[var(--color-surface-card)] rounded-2xl border border-[var(--color-border-subtle)] p-6 sm:p-8 shadow-[var(--shadow-raised)] space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center justify-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-[#0284C7] text-white flex items-center justify-center shadow-md shadow-[#0284C7]/20 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="text-xl font-extrabold tracking-tight text-[#0A2540] dark:text-[#F1F5F9]">
                Cure<span className="text-[#0284C7] dark:text-[#38BDF8]">Nova</span>
              </span>
            </div>
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Sign In
          </h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            Choose your role and enter your workspace
          </p>
        </div>

        {/* Role Selector Tabs (Doctor, Researcher, Patient) */}
        <div>
          <label className="block text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
            Select Persona
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)]">
            {ROLES.map((r) => {
              const Icon = r.icon;
              const isSelected = selectedRole === r.role;
              const rColor = isDark ? (r.darkColor || r.color) : r.color;
              return (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => handleRoleSelect(r.role)}
                  className={`flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--color-surface-card)] text-[var(--color-text-primary)] shadow-sm border border-[var(--color-border-subtle)]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <Icon
                    className="w-4 h-4"
                    style={{ color: isSelected ? rColor : undefined }}
                  />
                  <span className="text-[11px]">{r.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Demo Account Indicator Pill */}
        <div
          className="p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors"
          style={{
            backgroundColor: isDark ? `${activeColor}1A` : `${activeColor}10`,
            borderColor: isDark ? `${activeColor}40` : `${activeColor}30`
          }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" style={{ color: activeColor }} />
            <span className="font-semibold text-[var(--color-text-primary)] text-[11px]">
              Demo: <strong style={{ color: activeColor }}>{activeRoleMeta.demoName}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setEmail(activeRoleMeta.demoEmail);
              setPassword(activeRoleMeta.demoPass);
            }}
            className="text-[10px] font-bold underline hover:opacity-80 cursor-pointer"
            style={{ color: activeColor }}
          >
            Auto-fill
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[var(--color-text-secondary)]">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@example.com"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-sunken)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[#0284C7] transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[var(--color-text-secondary)]">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-[11px] font-semibold text-[#0284C7] dark:text-[#38BDF8] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-sunken)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[#0284C7] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-0.5 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm text-white transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 hover:shadow-lg active:scale-[0.98] mt-2"
            style={{ backgroundColor: activeRoleMeta.color }}
          >
            {loading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <span>Sign In as {activeRoleMeta.label}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <p className="text-center text-xs text-[var(--color-text-muted)] pt-2 border-t border-[var(--color-border-subtle)]">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-[#0284C7] dark:text-[#38BDF8] hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
