import React from 'react';
import { motion } from 'framer-motion';
import { Activity, ShieldCheck, AlertTriangle, Sparkles, Zap, CheckCircle2 } from 'lucide-react';

/**
 * HealthCapsule Component
 * An animated, pharmaceutical-grade capsule pill component built with Framer Motion.
 * Supports split-tone colors, gloss highlight, live status badges, interactive hover,
 * floating physics, and active inspector states.
 */
export const HealthCapsule = ({
  name,
  code,
  target,
  indication,
  status = 'FDA Approved',
  safetyScore = 95,
  variant = 'cyan', // 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet' | 'indigo'
  selected = false,
  onClick,
  floating = false,
  floatDelay = 0,
  size = 'md', // 'sm' | 'md' | 'lg'
  className = '',
}) => {
  // Color theme definitions for split-tone pharmaceutical capsules
  const colorThemes = {
    cyan: {
      leftBg: 'bg-gradient-to-r from-sky-600 to-cyan-500',
      rightBg: 'bg-gradient-to-r from-sky-100 to-white dark:from-sky-950/80 dark:to-gray-900',
      border: 'border-cyan-300/40 dark:border-cyan-500/30',
      glow: 'shadow-cyan-500/20 hover:shadow-cyan-500/35',
      badge: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800',
      accentText: 'text-cyan-600 dark:text-cyan-400',
      icon: Sparkles,
    },
    emerald: {
      leftBg: 'bg-gradient-to-r from-emerald-600 to-teal-500',
      rightBg: 'bg-gradient-to-r from-emerald-100 to-white dark:from-emerald-950/80 dark:to-gray-900',
      border: 'border-emerald-300/40 dark:border-emerald-500/30',
      glow: 'shadow-emerald-500/20 hover:shadow-emerald-500/35',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
      accentText: 'text-emerald-600 dark:text-emerald-400',
      icon: CheckCircle2,
    },
    amber: {
      leftBg: 'bg-gradient-to-r from-amber-600 to-yellow-500',
      rightBg: 'bg-gradient-to-r from-amber-100 to-white dark:from-amber-950/80 dark:to-gray-900',
      border: 'border-amber-300/40 dark:border-amber-500/30',
      glow: 'shadow-amber-500/20 hover:shadow-amber-500/35',
      badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
      accentText: 'text-amber-600 dark:text-amber-400',
      icon: AlertTriangle,
    },
    rose: {
      leftBg: 'bg-gradient-to-r from-rose-600 to-pink-500',
      rightBg: 'bg-gradient-to-r from-rose-100 to-white dark:from-rose-950/80 dark:to-gray-900',
      border: 'border-rose-300/40 dark:border-rose-500/30',
      glow: 'shadow-rose-500/20 hover:shadow-rose-500/35',
      badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
      accentText: 'text-rose-600 dark:text-rose-400',
      icon: AlertTriangle,
    },
    violet: {
      leftBg: 'bg-gradient-to-r from-violet-600 to-purple-500',
      rightBg: 'bg-gradient-to-r from-violet-100 to-white dark:from-violet-950/80 dark:to-gray-900',
      border: 'border-violet-300/40 dark:border-violet-500/30',
      glow: 'shadow-violet-500/20 hover:shadow-violet-500/35',
      badge: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800',
      accentText: 'text-violet-600 dark:text-violet-400',
      icon: Zap,
    },
    indigo: {
      leftBg: 'bg-gradient-to-r from-blue-700 to-indigo-600',
      rightBg: 'bg-gradient-to-r from-blue-100 to-white dark:from-indigo-950/80 dark:to-gray-900',
      border: 'border-indigo-300/40 dark:border-indigo-500/30',
      glow: 'shadow-indigo-500/20 hover:shadow-indigo-500/35',
      badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
      accentText: 'text-blue-600 dark:text-blue-400',
      icon: ShieldCheck,
    },
  };

  const currentTheme = colorThemes[variant] || colorThemes.cyan;
  const BadgeIcon = currentTheme.icon;

  // Floating animation variant
  const floatAnimation = floating
    ? {
        y: [-4, 5, -4],
        rotate: [-1, 1, -1],
        transition: {
          duration: 4.5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: floatDelay,
        },
      }
    : {};

  if (size === 'sm') {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        animate={floatAnimation}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.96 }}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm transition-all text-xs cursor-pointer select-none ${
          currentTheme.border
        } ${selected ? 'ring-2 ring-blue-500 shadow-md' : ''} ${className}`}
      >
        <span className="relative flex h-3.5 w-7 shrink-0 items-center rounded-full overflow-hidden border border-black/10 dark:border-white/10 shadow-inner">
          <span className={`w-1/2 h-full ${currentTheme.leftBg}`} />
          <span className={`w-1/2 h-full ${currentTheme.rightBg}`} />
          {/* Glass sheen */}
          <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/60 to-transparent" />
        </span>
        <span className="font-bold text-gray-900 dark:text-gray-100">{name}</span>
        {code && <span className="font-mono text-[10px] text-gray-500 dark:text-gray-400">{code}</span>}
      </motion.button>
    );
  }

  return (
    <motion.div
      animate={floatAnimation}
      whileHover={{ scale: 1.025, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`group relative rounded-2xl border p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl shadow-sm transition-all duration-300 cursor-pointer ${
        currentTheme.border
      } ${currentTheme.glow} ${
        selected ? 'ring-2 ring-blue-500 shadow-lg' : ''
      } ${className}`}
    >
      {/* Visual Pill Capsule Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          {/* 3D-Look Pill Capsule */}
          <div className="relative flex h-7 w-14 shrink-0 items-center rounded-full overflow-hidden border border-black/10 dark:border-white/15 shadow-md">
            {/* Left Hemisphere */}
            <div className={`w-1/2 h-full flex items-center justify-center ${currentTheme.leftBg}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
            </div>
            {/* Right Hemisphere */}
            <div className={`w-1/2 h-full flex items-center justify-center ${currentTheme.rightBg}`}>
              <div className="w-1 h-1 rounded-full bg-black/10 dark:bg-white/20" />
            </div>
            {/* Top Gloss Reflection */}
            <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-b from-white/70 to-transparent pointer-events-none" />
            {/* Bottom Subtle Shadow */}
            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {name}
              </h4>
              {code && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  {code}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[170px]">
              {target || indication}
            </p>
          </div>
        </div>

        {/* Status Pill Badge */}
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${currentTheme.badge}`}
        >
          <BadgeIcon className="w-3 h-3" />
          <span>{status}</span>
        </span>
      </div>

      {/* Metric Strip */}
      <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 dark:border-gray-800 text-xs">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-500 dark:text-gray-400 text-[11px]">Safety Index:</span>
        </div>
        <div className="flex items-center gap-1 font-mono font-bold">
          <span className={currentTheme.accentText}>{safetyScore}/100</span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">✓ Safe</span>
        </div>
      </div>
    </motion.div>
  );
};

export default HealthCapsule;
