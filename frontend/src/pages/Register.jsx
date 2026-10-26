import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  Stethoscope,
  Microscope,
  HeartHandshake,
  AlertCircle,
  Lock,
  Mail,
  User,
  Building
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Input from '../components/ui/Input';

const ROLES = [
  {
    role: 'researcher',
    label: 'Researcher',
    icon: Microscope,
    accentColor: '#0284C7',
    darkAccentColor: '#38BDF8',
  },
  {
    role: 'doctor',
    label: 'Clinician',
    icon: Stethoscope,
    accentColor: '#0284C7',
    darkAccentColor: '#60A5FA',
  },
  {
    role: 'patient',
    label: 'Patient',
    icon: HeartHandshake,
    accentColor: '#15803D',
    darkAccentColor: '#34D399',
  },
];

export const Register = () => {
  const { register } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [role, setRole] = useState('doctor');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organization, setOrganization] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const activeRoleMeta = ROLES.find((r) => r.role === role) || ROLES[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please provide your name, email, and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const user = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        organization: organization.trim(),
      });
      navigate(`/${user.role}/dashboard`);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-[var(--color-surface-ground)]">
      <div className="w-full max-w-md bg-[var(--color-surface-card)] rounded-2xl border border-[var(--color-border-subtle)] p-6 sm:p-8 shadow-[var(--shadow-card)] transition-colors">
        
        {/* Brand Icon & Heading */}
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-brand-primary)] text-white shadow-md shadow-[var(--color-brand-primary)]/20 mb-3">
            <Activity className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Create Your Account
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            Register to access your specialized workspace
          </p>
        </div>

        {/* Role Selector Segmented Tabs */}
        <div className="mb-5">
          <label className="block text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2 text-center">
            Select Your Role
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[var(--color-surface-sunken)] rounded-xl border border-[var(--color-border-subtle)]">
            {ROLES.map((r) => {
              const Icon = r.icon;
              const isSelected = role === r.role;
              const roleColor = isDark ? (r.darkAccentColor || r.accentColor) : r.accentColor;
              return (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => {
                    setRole(r.role);
                    setError('');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--color-surface-card)] text-[var(--color-text-primary)] font-semibold shadow-sm border border-[var(--color-border-subtle)]'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <Icon
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: isSelected ? roleColor : 'inherit' }}
                  />
                  <span>{r.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[var(--color-status-critical-bg)] border border-[var(--color-status-critical-border)] text-[var(--color-status-critical-text)] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#dc2626]" />
            <span>{error}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Input
            label="Full Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dr. Jane Doe"
            icon={User}
            required
            autoFocus
          />

          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@institution.org"
            icon={Mail}
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            icon={Lock}
            required
          />

          <Input
            label="Hospital / Organization (Optional)"
            type="text"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="e.g. University Hospital"
            icon={Building}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] transition-colors shadow-sm cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? 'Creating Account…' : `Register as ${activeRoleMeta.label}`}
          </button>
        </form>

        {/* Sign In Footer */}
        <div className="text-center mt-6 pt-4 border-t border-[var(--color-border-subtle)]">
          <p className="text-xs text-[var(--color-text-muted)]">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-[var(--color-brand-primary)] hover:underline"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
