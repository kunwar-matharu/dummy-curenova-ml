import React from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

/**
 * BackgroundCapsuleFusion Component
 * Ultra-smooth, high-end ambient 3D pharmaceutical capsule fusion.
 * Renders in the background (fixed / pointer-events-none).
 *
 * Visual Features:
 * - 3D glass gloss curvature with specular highlights and refractive shadow.
 * - Precision laser-etched dosage details (CN-AI · Active Compound / Target Pocket).
 * - Floating inner luminescent bio-beads.
 * - Smooth scroll-driven docking: halves glide together from sides, lock seamlessly,
 *   emit a radiant shockwave halo, and then smoothly separate into soft ambient light.
 */
export const BackgroundCapsuleFusion = () => {
  const { scrollYProgress } = useScroll();

  // Spring physics for liquid-smooth motion
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 85,
    damping: 24,
    restDelta: 0.001,
  });

  // Left Capsule Half (Cobalt Sapphire / Electric Cyan):
  const leftX = useTransform(
    smoothProgress,
    [0.0, 0.22, 0.38, 0.65],
    [-170, 0, 0, -240]
  );
  const leftRotate = useTransform(
    smoothProgress,
    [0.0, 0.22, 0.38, 0.65],
    [-18, 0, 0, -20]
  );

  // Right Capsule Half (Pearlescent Emerald / Mint Opal):
  const rightX = useTransform(
    smoothProgress,
    [0.0, 0.22, 0.38, 0.65],
    [170, 0, 0, 240]
  );
  const rightRotate = useTransform(
    smoothProgress,
    [0.0, 0.22, 0.38, 0.65],
    [18, 0, 0, 20]
  );

  // Fusion Seam Glow: Pulses brightly when joined
  const fusionGlow = useTransform(
    smoothProgress,
    [0.15, 0.24, 0.36, 0.48],
    [0, 1, 1, 0]
  );

  // Shockwave Pulse Ring (fires around the moment of lock: 0.22 - 0.32)
  const pulseRingScale = useTransform(
    smoothProgress,
    [0.20, 0.28, 0.36],
    [0.7, 1.8, 2.4]
  );
  const pulseRingOpacity = useTransform(
    smoothProgress,
    [0.20, 0.26, 0.35],
    [0, 0.75, 0]
  );

  // Overall Capsule Opacity across the page
  const overallOpacity = useTransform(
    smoothProgress,
    [0.0, 0.08, 0.48, 0.70],
    [0.55, 0.95, 0.85, 0.22]
  );

  // Gentle vertical floating motion
  const capsuleY = useTransform(
    smoothProgress,
    [0.0, 0.30, 0.70],
    [0, 35, 110]
  );

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center select-none"
    >
      {/* Ambient background soft radial plasma lights */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-gradient-to-tr from-cyan-500/12 via-blue-600/12 to-emerald-500/12 blur-[140px] rounded-full" />
      <div className="absolute top-1/2 left-1/3 w-[450px] h-[450px] bg-indigo-500/8 blur-[120px] rounded-full" />

      {/* Main Floating Capsule Assembly */}
      <motion.div
        style={{
          y: capsuleY,
          opacity: overallOpacity,
        }}
        className="relative flex items-center justify-center filter drop-shadow-[0_25px_45px_rgba(2,132,199,0.3)] dark:drop-shadow-[0_30px_60px_rgba(0,0,0,0.85)] scale-[0.88] sm:scale-100"
      >
        {/* Shockwave Pulse Ring (Triggers on Join) */}
        <motion.div
          style={{
            scale: pulseRingScale,
            opacity: pulseRingOpacity,
          }}
          className="absolute w-44 h-44 rounded-full border-2 border-cyan-400 shadow-[0_0_50px_rgba(6,182,212,0.9)] pointer-events-none will-change-transform"
        />

        {/* Ambient Orbiting Ring */}
        <div className="absolute -inset-10 border border-cyan-500/20 dark:border-cyan-400/15 rounded-full scale-y-50 rotate-12 pointer-events-none" />

        {/* ── LEFT CAPSULE HALF (Royal Blue / Electric Cyan) ── */}
        <motion.div
          style={{
            x: leftX,
            rotateZ: leftRotate,
          }}
          className="relative flex items-center will-change-transform"
        >
          <div className="relative h-22 sm:h-30 w-32 sm:w-44 rounded-l-[54px] sm:rounded-l-[68px] bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-500 border-y-2 border-l-2 border-cyan-300/40 shadow-inner overflow-hidden flex items-center justify-center">
            
            {/* Top Multi-Layer Specular Glass Reflection */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/55 via-white/20 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
            
            {/* Fine Laser-Etched Measurement Grid Lines */}
            <div className="absolute left-6 top-3 bottom-3 w-px bg-white/20" />
            <div className="absolute left-10 top-4 bottom-4 w-px bg-white/10" />

            {/* Inner Luminescent Active Bio-Spheres */}
            <div className="flex items-center gap-2.5 px-4 opacity-90">
              <span className="w-3 h-3 rounded-full bg-cyan-100 shadow-sm animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-white/90 shadow-xs" />
              <span className="w-3 h-3 rounded-full bg-sky-200/90 shadow-xs" />
              <span className="w-2 h-2 rounded-full bg-cyan-300/80" />
            </div>

            {/* Precision Etched Label */}
            <div className="absolute bottom-2 left-5 flex items-center gap-1 font-mono text-[9px] font-bold tracking-wider text-cyan-100/90 uppercase">
              <span>LIGAND</span>
              <span className="text-[7px] text-cyan-200/60">· CN-01</span>
            </div>
          </div>

          {/* Precision Interlocking Seam Guide Lip */}
          <div className="h-22 sm:h-30 w-2 bg-gradient-to-b from-cyan-200 via-white to-cyan-400 rounded-r-[1px] shadow-sm" />
        </motion.div>

        {/* ── CENTRAL FUSION SEAM ENERGY BEAM (GLOWS BRIGHTLY WHEN JOINED) ── */}
        <motion.div
          style={{
            opacity: fusionGlow,
            scaleY: fusionGlow,
          }}
          className="absolute z-20 w-3 h-26 sm:h-36 bg-gradient-to-b from-cyan-300 via-white to-emerald-300 shadow-[0_0_40px_rgba(255,255,255,1)] rounded-full will-change-transform"
        />

        {/* ── RIGHT CAPSULE HALF (Pearlescent Emerald / Mint Opal) ── */}
        <motion.div
          style={{
            x: rightX,
            rotateZ: rightRotate,
          }}
          className="relative flex items-center will-change-transform"
        >
          {/* Seam Receiver Notch */}
          <div className="h-22 sm:h-30 w-2 bg-gradient-to-b from-emerald-200 via-white to-emerald-400 rounded-l-[1px] shadow-sm" />

          <div className="relative h-22 sm:h-30 w-32 sm:w-44 rounded-r-[54px] sm:rounded-r-[68px] bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-100 dark:to-emerald-200 border-y-2 border-r-2 border-emerald-300/40 shadow-inner overflow-hidden flex items-center justify-center">
            
            {/* Top Multi-Layer Specular Glass Reflection */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/60 via-white/25 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />

            {/* Fine Laser-Etched Measurement Grid Lines */}
            <div className="absolute right-6 top-3 bottom-3 w-px bg-emerald-950/20" />
            <div className="absolute right-10 top-4 bottom-4 w-px bg-emerald-950/10" />

            {/* Inner Target Pocket Beads */}
            <div className="flex items-center gap-2.5 px-4 opacity-90">
              <span className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-800/80 shadow-xs animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-teal-100" />
              <span className="w-3 h-3 rounded-full bg-white/95 shadow-xs" />
            </div>

            {/* Precision Etched Label */}
            <div className="absolute bottom-2 right-5 flex items-center gap-1 font-mono text-[9px] font-bold tracking-wider text-emerald-950/90 uppercase">
              <span>TARGET</span>
              <span className="text-[7px] text-emerald-900/60">· REC-98</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default BackgroundCapsuleFusion;
