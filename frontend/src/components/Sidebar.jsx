import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldCheck,
  FileText,
  Search,
  Share2,
  Stethoscope,
  Microscope,
  HeartHandshake,
  Cpu,
  BookmarkCheck,
  Sliders,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Tooltip from './ui/Tooltip';

export const Sidebar = ({ role }) => {
  const { user, logout } = useAuth();
  const currentRole = role || user?.role || 'doctor';

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('curenova_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('curenova_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const doctorNav = [
    { name: 'Overview', path: '/doctor/dashboard', icon: LayoutDashboard },
    { name: 'Medication Safety', path: '/doctor/medication-safety', icon: ShieldCheck },
    { name: 'Safety Results', path: '/doctor/results', icon: FileText },
  ];

  const researcherNav = [
    { name: 'Overview', path: '/researcher/dashboard', icon: LayoutDashboard },
    { name: 'Drug Research', path: '/researcher/drug-repurposing', icon: Microscope },
    { name: 'Candidates', path: '/researcher/results', icon: FileText },
  ];

  const patientNav = [
    { name: 'Overview', path: '/patient/dashboard', icon: HeartHandshake },
    { name: 'Check Medicines', path: '/patient/medication-safety', icon: ShieldCheck },
    { name: 'Safety Results', path: '/patient/results', icon: FileText },
  ];

  const sharedNav = [
    { name: 'Evidence', path: '/evidence', icon: Search },
    { name: 'Knowledge Graph', path: '/knowledge-graph', icon: Share2 },
  ];

  const activeNavList =
    currentRole === 'researcher' ? researcherNav : currentRole === 'patient' ? patientNav : doctorNav;

  const getPortalInfo = () => {
    switch (currentRole) {
      case 'researcher':
        return {
          label: 'Researcher Portal',
          sublabel: 'Translational Science',
          icon: Microscope,
          color: '#0284C7',
          activeBg: 'bg-[#EFF6FF] text-[#0284C7] dark:bg-[#0284C7]/20 dark:text-[#38BDF8]',
          indicator: 'bg-[#0284C7]',
        };
      case 'patient':
        return {
          label: 'Patient Portal',
          sublabel: 'Personal Health Guide',
          icon: HeartHandshake,
          color: '#16A34A',
          activeBg: 'bg-[#DCFCE7] text-[#16A34A] dark:bg-emerald-950/40 dark:text-emerald-300',
          indicator: 'bg-[#16A34A]',
        };
      default:
        return {
          label: 'Doctor Workspace',
          sublabel: 'Medication Safety',
          icon: Stethoscope,
          color: '#0A2540',
          activeBg: 'bg-[#EFF6FF] text-[#0284C7] dark:bg-slate-800/60 dark:text-[#38BDF8]',
          indicator: 'bg-[#0284C7]',
        };
    }
  };

  const portalInfo = getPortalInfo();
  const PortalIcon = portalInfo.icon;

  return (
    <aside
      className={`shrink-0 hidden md:flex flex-col border-r border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] min-h-[calc(100vh-4rem)] transition-all duration-200 select-none z-20 ${
        collapsed ? 'w-20 p-3' : 'w-64 p-3.5'
      } justify-between shadow-xs`}
    >
      <div className="space-y-5">
        {/* Workspace Portal Header & Collapse Toggle */}
        <div className="flex items-center justify-between gap-2">
          {!collapsed ? (
            <div className="px-3 py-2 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] flex-1 min-w-0 flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-xs"
                style={{ backgroundColor: `${portalInfo.color}20`, color: portalInfo.color }}
              >
                <PortalIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                  {portalInfo.label}
                </div>
                <div className="text-[10px] text-[var(--color-text-muted)] truncate font-medium">
                  {portalInfo.sublabel}
                </div>
              </div>
            </div>
          ) : (
            <Tooltip content={portalInfo.label} position="right">
              <div
                className="mx-auto p-2 rounded-xl border flex items-center justify-center"
                style={{
                  backgroundColor: `${portalInfo.color}15`,
                  borderColor: `${portalInfo.color}35`,
                  color: portalInfo.color,
                }}
              >
                <PortalIcon className="w-4 h-4" />
              </div>
            </Tooltip>
          )}

          <button
            type="button"
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer shrink-0"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Primary Role Navigation */}
        <div className="space-y-1">
          {!collapsed && (
            <div className="px-2 mb-1.5 text-[10px] font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
              WORKSPACE
            </div>
          )}
          <nav className="space-y-1">
            {activeNavList.map((item) => {
              const ItemIcon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path.indexOf('?') === -1}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition-all ${
                      isActive
                        ? `${portalInfo.activeBg} font-semibold shadow-2xs`
                        : 'text-[var(--color-text-secondary)] font-medium hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
                    } ${collapsed ? 'justify-center px-0 py-2.5' : ''}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {collapsed ? (
                        <Tooltip content={item.name} position="right">
                          <ItemIcon
                            className={`w-4 h-4 shrink-0 ${
                              isActive ? 'text-[#0284C7] dark:text-[#38BDF8]' : 'text-[var(--color-text-muted)]'
                            }`}
                          />
                        </Tooltip>
                      ) : (
                        <>
                          <ItemIcon
                            className={`w-4 h-4 shrink-0 transition-colors ${
                              isActive
                                ? 'text-[#0284C7] dark:text-[#38BDF8]'
                                : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)]'
                            }`}
                          />
                          <span className="truncate">{item.name}</span>
                        </>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Evidence Section */}
        <div className="space-y-1 pt-2 border-t border-[var(--color-border-subtle)]">
          {!collapsed && (
            <div className="px-2 mb-1.5 text-[10px] font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
              EVIDENCE
            </div>
          )}
          <nav className="space-y-1">
            {sharedNav.map((item) => {
              const ItemIcon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition-all ${
                      isActive
                        ? 'bg-[#EFF6FF] text-[#0284C7] dark:bg-[#0284C7]/20 dark:text-[#38BDF8] font-semibold shadow-2xs'
                        : 'text-[var(--color-text-secondary)] font-medium hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
                    } ${collapsed ? 'justify-center px-0 py-2.5' : ''}`
                  }
                >
                  {collapsed ? (
                    <Tooltip content={item.name} position="right">
                      <ItemIcon className="w-4 h-4 shrink-0" />
                    </Tooltip>
                  ) : (
                    <>
                      <ItemIcon className="w-4 h-4 shrink-0 text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)] transition-colors" />
                      <span className="truncate">{item.name}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Section: Evidence Trust Card + User Profile */}
      <div className="space-y-2 pt-3 border-t border-[var(--color-border-subtle)]">
        {!collapsed ? (
          <div className="p-2.5 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-[var(--color-text-primary)]">
                Evidence Grounded
              </span>
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)] font-mono">
              PubMed · openFDA · ChEMBL
            </p>
          </div>
        ) : (
          <Tooltip content="PubMed · openFDA · ChEMBL" position="right">
            <div className="mx-auto p-2 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] flex items-center justify-center text-emerald-600">
              <BookmarkCheck className="w-4 h-4" />
            </div>
          </Tooltip>
        )}

        {/* User Card */}
        {user && (
          <div
            className={`flex items-center gap-2 p-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] ${
              collapsed ? 'justify-center' : 'justify-between'
            }`}
          >
            {collapsed ? (
              <Tooltip content={`${user.name} (${user.role})`} position="right">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs"
                  style={{ backgroundColor: `${portalInfo.color}20`, color: portalInfo.color }}
                >
                  {user.name.charAt(0)}
                </div>
              </Tooltip>
            ) : (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
                    style={{ backgroundColor: `${portalInfo.color}20`, color: portalInfo.color }}
                  >
                    {user.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <span className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                      {user.name.split(',')[0]}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-muted)] capitalize truncate font-medium">
                      {user.role}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="p-1 text-[var(--color-text-muted)] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
