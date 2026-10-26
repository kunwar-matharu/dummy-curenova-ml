import React, { useState, useEffect } from 'react';
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
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = ({ role }) => {
  const { user, logout } = useAuth();
  const currentRole = role || user?.role || 'doctor';

  const [open, setOpen] = useState(() => {
    try {
      const stored = localStorage.getItem('curenova_sidebar_collapsed');
      if (stored !== null) {
        return stored !== 'true';
      }
      return typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
    } catch {
      return true;
    }
  });

  const toggleOpen = () => {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('curenova_sidebar_collapsed', String(!next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleOpen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const doctorNav = [
    { name: 'Dashboard', path: '/doctor/dashboard', icon: LayoutDashboard },
    { name: 'Medication Safety', path: '/doctor/medication-safety', icon: ShieldCheck, notifs: 3 },
    { name: 'Safety Results', path: '/doctor/results', icon: FileText },
  ];

  const researcherNav = [
    { name: 'Dashboard', path: '/researcher/dashboard', icon: LayoutDashboard },
    { name: 'Drug Research', path: '/researcher/drug-repurposing', icon: Microscope, notifs: 5 },
    { name: 'Candidates', path: '/researcher/results', icon: FileText },
  ];

  const patientNav = [
    { name: 'Dashboard', path: '/patient/dashboard', icon: HeartHandshake },
    { name: 'Check Medicines', path: '/patient/medication-safety', icon: ShieldCheck },
    { name: 'Safety Results', path: '/patient/results', icon: FileText },
  ];

  const sharedNav = [
    { name: 'Evidence Dossiers', path: '/evidence', icon: Search },
    { name: 'Knowledge Graph', path: '/knowledge-graph', icon: Share2 },
  ];

  const activeNavList =
    currentRole === 'researcher' ? researcherNav : currentRole === 'patient' ? patientNav : doctorNav;

  const getPortalInfo = () => {
    switch (currentRole) {
      case 'researcher':
        return {
          title: 'Researcher Portal',
          plan: 'Translational AI',
          icon: Microscope,
          color: 'from-teal-500 to-teal-600',
        };
      case 'patient':
        return {
          title: 'Patient Portal',
          plan: 'Health Companion',
          icon: HeartHandshake,
          color: 'from-emerald-500 to-emerald-600',
        };
      default:
        return {
          title: 'Clinician Workspace',
          plan: 'Clinical Intelligence',
          icon: Stethoscope,
          color: 'from-blue-600 to-indigo-600',
        };
    }
  };

  const portalInfo = getPortalInfo();
  const PortalIcon = portalInfo.icon;

  return (
    <nav
      className={`sticky top-14 sm:top-16 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] shrink-0 border-r transition-all duration-300 ease-in-out ${
        open ? 'w-64' : 'w-16'
      } border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2 shadow-sm flex flex-col justify-between select-none z-20`}
    >
      <div className="flex-1 overflow-y-auto pb-4 overflow-x-hidden">
        {/* Title Section */}
        <div className="mb-4 border-b border-gray-200 dark:border-gray-800 pb-3">
          <div
            className={`flex items-center rounded-lg p-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
              open ? 'justify-between' : 'justify-center'
            }`}
            title={!open ? `${portalInfo.title} (${portalInfo.plan})` : undefined}
          >
            <div className="flex items-center gap-3">
              <div
                className={`grid size-9 shrink-0 place-content-center rounded-lg bg-gradient-to-br ${portalInfo.color} shadow-sm text-white`}
              >
                <PortalIcon className="h-4 w-4" />
              </div>
              {open && (
                <div className="transition-opacity duration-200 overflow-hidden whitespace-nowrap">
                  <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {portalInfo.title}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {portalInfo.plan}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Primary Navigation Section */}
        <div className="space-y-1 mb-6">
          {open && (
            <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Workspace
            </div>
          )}
          {activeNavList.map((item) => {
            const ItemIcon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path.indexOf('?') === -1}
                title={!open ? item.name : undefined}
                className={({ isActive }) =>
                  `relative flex h-11 w-full items-center rounded-md transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 shadow-sm border-l-2 border-blue-500 font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                  }`
                }
              >
                {({ isActive: _isActive }) => (
                  <>
                    <div className="grid h-full w-12 place-content-center shrink-0">
                      <ItemIcon className="h-4 w-4" />
                    </div>
                    {open && (
                      <span className="text-sm font-medium transition-opacity duration-200 truncate whitespace-nowrap">
                        {item.name}
                      </span>
                    )}
                    {item.notifs && (
                      open ? (
                        <span className="absolute right-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs text-white font-medium">
                          {item.notifs}
                        </span>
                      ) : (
                        <span
                          className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-gray-900"
                          title={`${item.notifs} notifications`}
                        />
                      )
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Evidence & Knowledge Graph Section */}
        <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-1">
          {open && (
            <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Evidence Base
            </div>
          )}
          {sharedNav.map((item) => {
            const ItemIcon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={!open ? item.name : undefined}
                className={({ isActive }) =>
                  `relative flex h-11 w-full items-center rounded-md transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 shadow-sm border-l-2 border-blue-500 font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                  }`
                }
              >
                <div className="grid h-full w-12 place-content-center shrink-0">
                  <ItemIcon className="h-4 w-4" />
                </div>
                {open && (
                  <span className="text-sm font-medium transition-opacity duration-200 truncate whitespace-nowrap">
                    {item.name}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Bottom Section: Evidence Grounding + User Card + ToggleClose */}
      <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-800">
        {open && (
          <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Evidence Grounded
            </div>
            <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-mono truncate">
              PubMed · openFDA · ChEMBL
            </div>
          </div>
        )}

        {/* User Profile */}
        {user && (
          <div
            className={`flex items-center rounded-lg p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
              open ? 'justify-between' : 'justify-center'
            }`}
            title={!open ? `${user.name || 'User'} (${user.role || 'Member'})` : undefined}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="grid size-8 shrink-0 place-content-center rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-xs">
                {user.name?.charAt(0) || 'U'}
              </div>
              {open && (
                <div className="min-w-0 truncate whitespace-nowrap">
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 capitalize truncate">
                    {user.role}
                  </div>
                </div>
              )}
            </div>

            {open && (
              <button
                type="button"
                onClick={logout}
                className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Toggle Collapse Button */}
        <button
          type="button"
          onClick={toggleOpen}
          className={`w-full flex items-center ${
            open ? 'justify-between px-3' : 'justify-center'
          } py-2 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors cursor-pointer`}
          title={open ? 'Hide sidebar (Ctrl+B)' : 'Expand sidebar (Ctrl+B)'}
        >
          <div className="flex items-center gap-2">
            <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
            {open && <span className="text-xs font-medium whitespace-nowrap">Collapse</span>}
          </div>
          {open && <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">Ctrl+B</span>}
        </button>
      </div>
    </nav>
  );
};

export default Sidebar;
