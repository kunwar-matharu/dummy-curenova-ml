import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

export const DashboardLayout = ({ role }) => {
  const { user, refreshProfile } = useAuth();
  const currentRole = role || user?.role || 'doctor';
  const [checking, setChecking] = useState(false);

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      await refreshProfile();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <Sidebar role={currentRole} />
      <main className="flex-1 min-w-0 w-full px-4 sm:px-6 lg:px-8 py-8 max-w-[1600px] mx-auto">
        {user?.approval_status === 'pending' && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200 text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <span className="font-bold">Account Verification Pending:</span> Your {user.role} credentials are under administrative review. Experimental queries are monitored and privileged pipeline actions remain gated until approved.
              </div>
            </div>
            <button
              type="button"
              onClick={handleCheckStatus}
              disabled={checking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs whitespace-nowrap cursor-pointer transition-colors shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Checking...' : 'Check Approval Status'}</span>
            </button>
          </div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
};

export default DashboardLayout;
