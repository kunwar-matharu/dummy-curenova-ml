import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Activity,
  Search,
  Stethoscope,
  Microscope,
  HeartHandshake,
  User,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Sun,
  Moon,
  BookOpen,
  Share2,
  Info,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
  Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import CommandPalette from './ui/CommandPalette';
import Badge from './ui/Badge';

export const Navbar = () => {
  const { user, logout, switchRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const getRoleMeta = (role) => {
    switch (role) {
      case 'doctor':
        return { label: 'Clinician (MD)', shortLabel: 'Clinician', icon: Stethoscope, color: '#0A2540' };
      case 'researcher':
        return { label: 'Researcher (PhD)', shortLabel: 'Researcher', icon: Microscope, color: '#0284C7' };
      case 'patient':
        return { label: 'Patient / Caregiver', shortLabel: 'Patient', icon: HeartHandshake, color: '#16A34A' };
      default:
        return { label: 'Clinical Guest', shortLabel: 'Guest', icon: User, color: '#64748B' };
    }
  };

  const currentRoleMeta = user ? getRoleMeta(user.role) : null;
  const RoleIcon = currentRoleMeta?.icon || User;

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-card)]/95 backdrop-blur-md transition-colors duration-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto flex h-14 sm:h-16 items-center justify-between gap-4">
          
          {/* Brand Logo & Desktop Nav Links */}
          <div className="flex items-center gap-6 lg:gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-[#0284C7] text-white shadow-sm shadow-[#0284C7]/20 group-hover:scale-105 transition-transform duration-150">
                <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#16A34A] border border-white dark:border-[#0A1624]" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl font-extrabold tracking-tight text-[#0A2540] dark:text-[#F1F5F9]">
                  Cure<span className="text-[#0284C7] dark:text-[#38BDF8]">Nova</span>
                </span>
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD] dark:bg-[#0284C7]/20 dark:text-[#38BDF8] dark:border-[#0284C7]/40">
                  Biomedical AI
                </span>
              </div>
            </Link>

            {/* Workspace Context Badge (When logged in) */}
            {user ? (
              <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-[var(--color-border-subtle)]">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  {currentRoleMeta?.label || 'Workspace'}
                </span>
                <span className="w-1 h-1 rounded-full bg-[var(--color-border-strong)]" />
                <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                  Active Session
                </span>
              </div>
            ) : (
              <nav className="hidden md:flex items-center gap-1.5">
                <Link
                  to="/evidence"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Evidence Explorer</span>
                </Link>
                <Link
                  to="/knowledge-graph"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Knowledge Graph</span>
                </Link>
                <Link
                  to="/about"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>About</span>
                </Link>
              </nav>
            )}
          </div>

          {/* Right Actions: Role Switcher + Search + Theme + User Menu */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Verified Role Badge (Enforced single-role session) */}
            {user && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)] text-xs font-semibold select-none">
                <RoleIcon className="w-3.5 h-3.5" style={{ color: currentRoleMeta?.color }} />
                <span className="text-[var(--color-text-primary)] font-bold">{currentRoleMeta?.shortLabel}</span>
              </div>
            )}

            {/* Quick Search Shortcut (Logged In) */}
            {user && (
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(true)}
                className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)] rounded-xl transition-all cursor-pointer"
                title="Search commands and drugs (Cmd+K / Ctrl+K)"
              >
                <Search className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden lg:inline font-normal">Search clinical items...</span>
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-[var(--color-text-muted)] bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] rounded shadow-2xs">
                  ⌘K
                </kbd>
              </button>
            )}

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] rounded-xl border border-[var(--color-border-subtle)] transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-[#fbbf24]" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* User Account Menu */}
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAvatarDropdownOpen(!avatarDropdownOpen)}
                  className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-hover)] transition-all cursor-pointer select-none"
                  aria-expanded={avatarDropdownOpen}
                  aria-haspopup="menu"
                >
                  <div className="w-7 h-7 rounded-lg bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] flex items-center justify-center text-[var(--color-brand-primary)] font-bold text-xs shrink-0">
                    {user.name.charAt(0)}
                  </div>
                  <div className="hidden md:flex flex-col text-left">
                    <span className="text-xs font-semibold text-[var(--color-text-primary)] leading-tight truncate max-w-[120px]">
                      {user.name.split(',')[0]}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-muted)] capitalize leading-tight">
                      {user.role}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0 hidden md:block" />
                </button>

                {avatarDropdownOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-72 rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-card)] p-2 shadow-[var(--shadow-overlay)] z-50 animate-in fade-in slide-in-from-top-1"
                  >
                    {/* User Profile Header */}
                    <div className="p-3 border-b border-[var(--color-border-subtle)] mb-1.5">
                      <div className="text-xs font-bold text-[var(--color-text-primary)]">
                        {user.name}
                      </div>
                      <div className="text-[11px] text-[var(--color-text-muted)] truncate">
                        {user.email}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                          Active Persona
                        </span>
                        <Badge variant="info" size="sm">
                          {user.role.toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    {user.organization && (
                      <div className="p-2.5 mb-1.5 bg-[var(--color-surface-sunken)] rounded-xl border border-[var(--color-border-subtle)] text-[11px] text-[var(--color-text-secondary)]">
                        <span className="text-[10px] text-[var(--color-text-muted)] uppercase block tracking-wider font-semibold">Affiliation</span>
                        <span className="font-semibold text-[var(--color-text-primary)]">{user.organization}</span>
                      </div>
                    )}


                    {/* Sign Out */}
                    <div className="border-t border-[var(--color-border-subtle)] pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarDropdownOpen(false);
                          logout();
                          navigate('/login');
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-lg text-xs text-[#dc2626] dark:text-[#f87171] hover:bg-[var(--color-status-critical-bg)] cursor-pointer font-semibold"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] transition-colors shadow-xs"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] rounded-xl border border-[var(--color-border-subtle)] md:hidden transition-colors cursor-pointer"
              aria-label="Toggle mobile navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer / Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-4 py-4 space-y-4 animate-in fade-in slide-in-from-top-2">
            {/* Authenticated Workspace Section */}
            {user && (
              <div className="space-y-2 pb-3 border-b border-[var(--color-border-subtle)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[var(--color-brand-surface)] flex items-center justify-center font-bold text-xs text-[var(--color-brand-primary)]">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[var(--color-text-primary)]">{user.name}</div>
                      <div className="text-[10px] text-[var(--color-text-muted)] capitalize">{user.role} Workspace</div>
                    </div>
                  </div>
                  <Badge variant="info" size="sm">{user.role.toUpperCase()}</Badge>
                </div>

                <div className="grid grid-cols-3 gap-1.5 pt-2">
                  {[
                    { role: 'doctor', label: 'Doctor', icon: Stethoscope },
                    { role: 'researcher', label: 'Researcher', icon: Microscope },
                    { role: 'patient', label: 'Patient', icon: HeartHandshake },
                  ].map((r) => {
                    const Icon = r.icon;
                    const isSelected = user.role === r.role;
                    return (
                      <button
                        key={r.role}
                        type="button"
                        onClick={() => handleRoleChange(r.role)}
                        className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold border ${
                          isSelected
                            ? 'bg-[#0284c7] text-white border-[#0284c7]'
                            : 'bg-[var(--color-surface-sunken)] text-[var(--color-text-secondary)] border-[var(--color-border-subtle)]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Navigation Links */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block px-2 mb-1">
                Navigation
              </span>
              {user && (
                <Link
                  to={`/${user.role}/dashboard`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]"
                >
                  <span>My Clinical Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                </Link>
              )}
              <Link
                to="/evidence"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#0284c7]" />
                  <span>Biomedical Evidence Explorer</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              </Link>
              <Link
                to="/knowledge-graph"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]"
              >
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-[#8b5cf6]" />
                  <span>Knowledge Graph Network</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              </Link>
              <Link
                to="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]"
              >
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#0d9488]" />
                  <span>About & Regulatory Guardrails</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              </Link>
            </div>

            {/* Mobile Actions: Cmd+K Search trigger + Sign Out */}
            <div className="pt-2 border-t border-[var(--color-border-subtle)] space-y-2">
              {user ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setCommandPaletteOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-primary)]"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Open Clinical Search (⌘K)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                      navigate('/login');
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-[var(--color-status-critical-bg)] border border-[var(--color-status-critical-border)] text-xs font-bold text-[#dc2626] dark:text-[#f87171]"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center py-2.5 rounded-xl text-xs font-semibold bg-[var(--color-surface-sunken)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)]"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center py-2.5 rounded-xl text-xs font-semibold bg-[#0284c7] text-white"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </>
  );
};

export default Navbar;
