import React from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Sparkles, ShieldCheck, Zap } from 'lucide-react';

/**
 * HeroCapsuleFusion Component
 * Dedicated, un-obscured 3D pharmaceutical capsule fusion showcase
 * designed for the Hero right-hand column.
 *
 * Features:
 * - Positioned cleanly away from center text (no overlap with headlines).
 * - Multi-layer specular glass curvature and luminescent bio-beads.
 * - Precision laser-etched labels: LIGAND · CN-01 and TARGET · REC-98.
 * - Scroll-Driven Motion:
 *   - Scroll 0: Two capsule halves start separated.
 *   - Scroll down 100-300px: Halves glide together, join seamlessly, and emit a pulse ring.
 *   - Scroll past hero: Halves smoothly separate.
 */
export const HeroCapsuleFusion = () => {
  const { scrollY } = useScroll();

  // Spring physics for liquid-smooth fluid motion without any stutter
  const smoothY = useSpring(scrollY, {
    stiffness: 90,
    damping: 24,
    restDelta: 0.001,
  });

  // Scroll mapping based on pixel scroll (0 to 600px):
  // 0px: Separated (-130px)
  // 180px - 340px: Perfectly Joined (0px)
  // 550px+: Smoothly Separated (-170px)
  const leftX = useTransform(smoothY, [0, 180, 340, 580], [-125, 0, 0, -170]);
  const leftRotate = useTransform(smoothY, [0, 180, 340, 580], [-14, 0, 0, -16]);

  const rightX = useTransform(smoothY, [0, 180, 340, 580], [125, 0, 0, 170]);
  const rightRotate = useTransform(smoothY, [0, 180, 340, 580], [14, 0, 0, 16]);

  // Seam glow triggers when joined
  const seamGlow = useTransform(smoothY, [120, 190, 330, 420], [0, 1, 1, 0]);

  // Shockwave pulse ring triggers right around the locking point
  const ringScale = useTransform(smoothY, [160, 240, 320], [0.8, 1.9, 2.5]);
  const ringOpacity = useTransform(smoothY, [160, 220, 300], [0, 0.8, 0]);

  // Status text transition based on fusion state
  const statusOpacity = useTransform(smoothY, [140, 200], [0, 1]);

  return (
    <div className="relative w-full max-w-lg mx-auto flex flex-col items-center justify-center select-none py-6">
      
      {/* Ambient Radial Backlighting */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[320px] sm:w-[420px] h-[320px] sm:h-[420px] bg-gradient-to-tr from-cyan-500/15 via-blue-500/15 to-emerald-500/15 blur-[90px] rounded-full" />
      </div>

      {/* 3D Visual Stage */}
      <div className="relative h-[260px] sm:h-[320px] w-full flex items-center justify-center">
        
        {/* Shockwave Pulse Ring (Fires on lock) */}
        <motion.div
          style={{
            scale: ringScale,
            opacity: ringOpacity,
          }}
          className="absolute w-36 h-36 rounded-full border-2 border-cyan-400 shadow-[0_0_45px_rgba(6,182,212,0.85)] pointer-events-none will-change-transform"
        />

        {/* Ambient Orbit Guide Circle */}
        <div className="absolute w-[290px] sm:w-[360px] h-[140px] sm:h-[170px] border border-cyan-500/20 dark:border-cyan-400/20 rounded-full rotate-6 pointer-events-none" />

        {/* ── THE 3D CAPSULE DOCKING ASSEMBLY ── */}
        <div className="relative flex items-center justify-center filter drop-shadow-[0_20px_35px_rgba(2,132,199,0.35)] dark:drop-shadow-[0_25px_45px_rgba(0,0,0,0.85)] scale-90 sm:scale-100">
          
          {/* 1. LEFT HALF: LIGAND COMPOUND (Electric Cyan / Royal Blue) */}
          <motion.div
            style={{
              x: leftX,
              rotateZ: leftRotate,
            }}
            className="relative flex items-center will-change-transform z-10"
          >
            <div className="relative h-22 sm:h-28 w-28 sm:w-38 rounded-l-[50px] sm:rounded-l-[62px] bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-500 border-y-2 border-l-2 border-cyan-300/50 shadow-inner overflow-hidden flex items-center justify-center">
              
              {/* Multi-Layer Specular Glass Highlight */}
              <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/60 via-white/20 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
              
              {/* Laser-Etched Measurement Grid Lines */}
              <div className="absolute left-5 top-3 bottom-3 w-px bg-white/25" />
              <div className="absolute left-8 top-4 bottom-4 w-px bg-white/15" />

              {/* Luminescent Micro Bio-Spheres */}
              <div className="flex items-center gap-2 px-3 opacity-90">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-100 shadow-sm animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-white/90" />
                <span className="w-2.5 h-2.5 rounded-full bg-sky-200" />
              </div>

              {/* Laser Label */}
              <div className="absolute bottom-2 left-4 flex items-center gap-1 font-mono text-[9px] font-bold tracking-wider text-cyan-100/90 uppercase">
                <span>LIGAND</span>
                <span className="text-[7px] text-cyan-200/70">· CN-01</span>
              </div>
            </div>

            {/* Precision Interlocking Seam Lip */}
            <div className="h-22 sm:h-28 w-1.5 bg-gradient-to-b from-cyan-200 via-white to-cyan-400 rounded-r-[1px] shadow-sm" />
          </motion.div>

          {/* 2. CENTRAL FUSION SEAM ENERGY BEAM (GLOWS WHEN JOINED) */}
          <motion.div
            style={{
              opacity: seamGlow,
              scaleY: seamGlow,
            }}
            className="absolute z-20 w-2.5 h-26 sm:h-34 bg-gradient-to-b from-cyan-300 via-white to-emerald-300 shadow-[0_0_35px_rgba(255,255,255,1)] rounded-full will-change-transform"
          />

          {/* 3. RIGHT HALF: RECEPTOR TARGET (Pearlescent Emerald / Mint Opal) */}
          <motion.div
            style={{
              x: rightX,
              rotateZ: rightRotate,
            }}
            className="relative flex items-center will-change-transform z-10"
          >
            {/* Seam Receiver Notch */}
            <div className="h-22 sm:h-28 w-1.5 bg-gradient-to-b from-emerald-200 via-white to-emerald-400 rounded-l-[1px] shadow-sm" />

            <div className="relative h-22 sm:h-28 w-28 sm:w-38 rounded-r-[50px] sm:rounded-r-[62px] bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-100 dark:to-emerald-200 border-y-2 border-r-2 border-emerald-300/50 shadow-inner overflow-hidden flex items-center justify-center">
              
              {/* Multi-Layer Specular Glass Highlight */}
              <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/60 via-white/25 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />

              {/* Laser-Etched Measurement Grid Lines */}
              <div className="absolute right-5 top-3 bottom-3 w-px bg-emerald-950/25" />
              <div className="absolute right-8 top-4 bottom-4 w-px bg-emerald-950/15" />

              {/* Target Pocket Beads */}
              <div className="flex items-center gap-2 px-3 opacity-90">
                <span className="w-2 h-2 rounded-full bg-white shadow-xs" />
                <span className="w-3 h-3 rounded-full bg-emerald-800/80 shadow-xs animate-pulse" />
                <span className="w-2.5 h-2.5 rounded-full bg-teal-100" />
              </div>

              {/* Laser Label */}
              <div className="absolute bottom-2 right-4 flex items-center gap-1 font-mono text-[9px] font-bold tracking-wider text-emerald-950/90 uppercase">
                <span>TARGET</span>
                <span className="text-[7px] text-emerald-900/70">· REC-98</span>
              </div>
            </div>
          </motion.div>

        </div>

      </div>

      {/* ── CLEAN BOTTOM FUSION TELEMETRY CHIP ── */}
      <div className="relative z-10 flex flex-col items-center gap-1.5 pt-2">
        <motion.div
          style={{ opacity: statusOpacity }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 text-[11px] font-bold shadow-xs"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Capsule Fusion Locked · 100% Specificity</span>
        </motion.div>
        
        <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">
          Scroll down to simulate clinical docking &amp; clearance
        </span>
      </div>

    </div>
  );
};

export default HeroCapsuleFusion;
