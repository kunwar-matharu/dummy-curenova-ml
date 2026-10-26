import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * CapsuleFusionScroll Component
 * Pure, hyper-polished scroll-driven capsule joining experience.
 * As the user scrolls, two beautifully styled pharmaceutical capsule halves
 * glide inward from the sides, rotate smoothly into alignment, and lock/join seamlessly
 * in the center with a subtle glowing aura and clean clinical perfection.
 */
export const CapsuleFusionScroll = ({ onLaunchRole }) => {
  const containerRef = useRef(null);

  // Smooth scroll tracking across an optimal 180vh scroll length
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    restDelta: 0.001,
  });

  // Left Capsule Half: Glides in from left, tilts slightly, and aligns perfectly at 0
  const leftX = useTransform(smoothProgress, [0.05, 0.5], [-260, 0]);
  const leftRotate = useTransform(smoothProgress, [0.05, 0.5], [-18, 0]);
  const leftScale = useTransform(smoothProgress, [0.05, 0.5], [0.92, 1]);

  // Right Capsule Half: Glides in from right, tilts slightly, and aligns perfectly at 0
  const rightX = useTransform(smoothProgress, [0.05, 0.5], [260, 0]);
  const rightRotate = useTransform(smoothProgress, [0.05, 0.5], [18, 0]);
  const rightScale = useTransform(smoothProgress, [0.05, 0.5], [0.92, 1]);

  // Fusion moment glow & energy pulse
  const fusionGlow = useTransform(smoothProgress, [0.45, 0.52, 0.85], [0, 1, 0.75]);
  const shockwaveScale = useTransform(smoothProgress, [0.48, 0.65], [0.6, 2.0]);
  const shockwaveOpacity = useTransform(smoothProgress, [0.48, 0.56, 0.68], [0, 0.8, 0]);

  // Content reveal upon joining
  const textOpacity = useTransform(smoothProgress, [0.48, 0.6], [0, 1]);
  const textY = useTransform(smoothProgress, [0.48, 0.6], [24, 0]);

  // Pre-join instruction fade
  const instructionOpacity = useTransform(smoothProgress, [0.0, 0.35], [1, 0]);

  return (
    <div
      ref={containerRef}
      id="capsule-fusion"
      className="relative bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white min-h-[190vh] select-none"
    >
      {/* Sticky Fullscreen Stage */}
      <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-between overflow-hidden px-4 sm:px-6 lg:px-8 py-10 pointer-events-auto">
        
        {/* Subtle Ambient Radial Lighting */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-blue-600/15 via-cyan-500/15 to-emerald-500/15 blur-[120px] rounded-full" />
        </div>

        {/* ── TOP SECTION: Elegant Badge ── */}
        <div className="relative z-10 text-center max-w-xl mx-auto space-y-2 pt-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs font-semibold text-cyan-300 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Scroll-Driven Precision Molecular Docking</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
            Target Molecule &amp; Safety Fusion
          </h3>
          
          {/* Scroll instruction that smoothly fades out as capsules approach */}
          <motion.p
            style={{ opacity: instructionOpacity }}
            className="text-xs text-gray-400 font-medium"
          >
            Scroll to join the therapeutic candidate with the receptor pocket
          </motion.p>
        </div>

        {/* ── CENTER STAGE: THE CAPSULE JOINING ── */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-auto w-full">
          
          {/* Fusion Shockwave Energy Ring */}
          <motion.div
            style={{
              scale: shockwaveScale,
              opacity: shockwaveOpacity,
            }}
            className="absolute w-44 h-44 rounded-full border-2 border-cyan-400/80 shadow-[0_0_60px_rgba(6,182,212,0.8)] pointer-events-none"
          />

          {/* 3D Perspective Container */}
          <div className="relative flex items-center justify-center filter drop-shadow-[0_25px_50px_rgba(0,0,0,0.85)]">
            
            {/* ── LEFT HALF: THERAPEUTIC COMPOUND (Vibrant Cobalt Cyan) ── */}
            <motion.div
              style={{
                x: leftX,
                rotateZ: leftRotate,
                scale: leftScale,
              }}
              className="relative flex items-center z-10"
            >
              <div className="relative h-24 sm:h-32 md:h-36 w-32 sm:w-44 md:w-52 rounded-l-[60px] sm:rounded-l-[72px] bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 border-y-2 border-l-2 border-cyan-300/40 shadow-inner overflow-hidden flex items-center justify-center">
                
                {/* 3D Cylindrical Glass Reflection Highlighting */}
                <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/45 via-white/15 to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/35 to-transparent pointer-events-none" />
                
                {/* Internal Medicine Active Spheres */}
                <div className="flex items-center gap-2.5 px-4 opacity-90">
                  <span className="w-3.5 h-3.5 rounded-full bg-cyan-100 shadow-sm animate-pulse" />
                  <span className="w-2.5 h-2.5 rounded-full bg-white/80" />
                  <span className="w-3 h-3 rounded-full bg-sky-200 shadow-sm" />
                  <span className="w-2 h-2 rounded-full bg-cyan-200/90" />
                </div>

                {/* Left Label */}
                <span className="absolute bottom-2.5 left-5 font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-cyan-100/90">
                  Ligand Molecule
                </span>
              </div>

              {/* Laser-Finished Seam Lip */}
              <div className="h-24 sm:h-32 md:h-36 w-2 bg-gradient-to-b from-cyan-200 via-white to-cyan-400 rounded-r-[1px] shadow-sm" />
            </motion.div>

            {/* ── CENTRAL FUSION SEAM GLOW (LIGHTS UP UPON JOINING) ── */}
            <motion.div
              style={{
                opacity: fusionGlow,
                scaleY: fusionGlow,
              }}
              className="absolute z-20 w-2.5 h-28 sm:h-36 md:h-40 bg-gradient-to-b from-cyan-300 via-white to-emerald-300 shadow-[0_0_30px_rgba(255,255,255,1)] rounded-full pointer-events-none"
            />

            {/* ── RIGHT HALF: RECEPTOR TARGET (Pearlescent Emerald White) ── */}
            <motion.div
              style={{
                x: rightX,
                rotateZ: rightRotate,
                scale: rightScale,
              }}
              className="relative flex items-center z-10"
            >
              {/* Receiver Seam */}
              <div className="h-24 sm:h-32 md:h-36 w-2 bg-gradient-to-b from-emerald-200 via-white to-emerald-400 rounded-l-[1px] shadow-sm" />

              <div className="relative h-24 sm:h-32 md:h-36 w-32 sm:w-44 md:w-52 rounded-r-[60px] sm:rounded-r-[72px] bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-100 border-y-2 border-r-2 border-emerald-300/40 shadow-inner overflow-hidden flex items-center justify-center">
                
                {/* 3D Cylindrical Glass Reflection Highlighting */}
                <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 via-white/20 to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />

                {/* Internal Target Binding Beads */}
                <div className="flex items-center gap-2.5 px-4 opacity-90">
                  <span className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-800/70 shadow-sm animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-teal-100" />
                  <span className="w-3 h-3 rounded-full bg-white/90" />
                </div>

                {/* Right Label */}
                <span className="absolute bottom-2.5 right-5 font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-950/90">
                  Target Receptor
                </span>
              </div>
            </motion.div>

          </div>

          {/* ── POST-JOIN FUSED RESULT BANNER ── */}
          <motion.div
            style={{
              opacity: textOpacity,
              y: textY,
            }}
            className="mt-8 text-center space-y-3 max-w-xl mx-auto px-4"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-bold shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Capsule Fusion Locked · 100% Target Specificity</span>
            </div>

            <h4 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Precision Molecule Meets Clinical Safety
            </h4>
            
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-md mx-auto">
              Simulate patient-specific clearance, target binding affinities, and polypharmacy interaction matrices in real-time.
            </p>

            <div className="pt-2 flex items-center justify-center gap-3">
              {onLaunchRole ? (
                <button
                  type="button"
                  onClick={() => onLaunchRole('doctor')}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-500/30 transition-all cursor-pointer"
                >
                  <span>Enter Doctor Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <Link
                  to="/doctor/dashboard"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-500/30 transition-all"
                >
                  <span>Enter Doctor Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}

              <Link
                to="/evidence"
                className="px-4 py-2.5 rounded-xl border border-white/20 hover:bg-white/10 text-white font-semibold text-xs transition-colors"
              >
                Evidence Dossiers
              </Link>
            </div>
          </motion.div>

        </div>

        {/* ── BOTTOM INDICATOR ── */}
        <div className="relative z-10 pb-1 text-center text-[11px] text-gray-500 font-mono">
          CureNova Precision Pharmacology · Continuous Scroll
        </div>

      </div>
    </div>
  );
};

export default CapsuleFusionScroll;
