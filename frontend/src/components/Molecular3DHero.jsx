import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sparkles, Compass, Eye, ShieldCheck } from 'lucide-react';

/**
 * Molecular3DHero
 * A high-performance, interactive 3D molecular visualization rendered on an HTML5 canvas.
 * Simulates a ligand-target receptor binding pocket with real-time 3D rotation, depth shading,
 * dynamic bonds, particle orbital halo, and mouse-directed interactive tilt.
 *
 * Fully responsive, theme-aware (Light: Teal/Navy, Dark: Cyan/Violet),
 * pauses when out of viewport, and respects prefers-reduced-motion.
 */
export default function Molecular3DHero({ className = '' }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Viewport intersection observer to pause rendering when scrolled away
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Molecular 3D Nodes definition (fixed stable scientific geometry)
  const atoms = useMemo(() => {
    return [
      // Core cluster (Ligand pharmacophore center)
      { id: 0, x: 0, y: 0, z: 0, radius: 14, element: 'C', charge: 'core' },
      { id: 1, x: 38, y: -22, z: 25, radius: 10, element: 'N', charge: 'donor' },
      { id: 2, x: -35, y: -30, z: -18, radius: 11, element: 'O', charge: 'acceptor' },
      { id: 3, x: 42, y: 35, z: -15, radius: 9, element: 'C', charge: 'hydrophobic' },
      { id: 4, x: -45, y: 28, z: 22, radius: 10, element: 'F', charge: 'halogen' },
      { id: 5, x: 5, y: -55, z: 12, radius: 8, element: 'O', charge: 'acceptor' },
      { id: 6, x: -12, y: 50, z: -28, radius: 9, element: 'N', charge: 'donor' },

      // Outer satellite binding residues (Receptor interface contacts)
      { id: 7, x: 75, y: -10, z: -40, radius: 7, element: 'S', charge: 'sulfur' },
      { id: 8, x: -68, y: -45, z: 45, radius: 7, element: 'C', charge: 'hydrophobic' },
      { id: 9, x: 20, y: 70, z: 35, radius: 8, element: 'O', charge: 'acceptor' },
      { id: 10, x: -75, y: 15, z: -35, radius: 7, element: 'N', charge: 'donor' },
      { id: 11, x: 55, y: -60, z: -10, radius: 6, element: 'C', charge: 'hydrophobic' },
      { id: 12, x: -25, y: -72, z: -25, radius: 6, element: 'H', charge: 'hydrogen' },
      { id: 13, x: 62, y: 48, z: 30, radius: 7, element: 'Cl', charge: 'halogen' },
    ];
  }, []);

  // Chemical Bonds between atoms
  const bonds = useMemo(() => {
    return [
      [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
      [1, 7], [2, 8], [3, 9], [4, 10], [5, 11], [5, 12], [3, 13],
      [1, 3], [2, 4], [7, 11], [8, 10]
    ];
  }, []);

  // Ambient orbital particles halo
  const particles = useMemo(() => {
    const list = [];
    const count = 36;
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 90 + Math.random() * 45;
      list.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
        size: 1.2 + Math.random() * 1.6,
        alpha: 0.2 + Math.random() * 0.4
      });
    }
    return list;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let angleX = 0.25;
    let angleY = 0.4;
    let angleZ = 0.05;

    // Palette resolution
    const isDark = theme === 'dark' || document.documentElement.classList.contains('dark');
    const colors = {
      core: isDark ? '#2DD4BF' : '#0D9488',
      donor: isDark ? '#38BDF8' : '#0284C7',
      acceptor: isDark ? '#A99AFB' : '#7865D5',
      halogen: isDark ? '#34D399' : '#15803D',
      hydrophobic: isDark ? '#94A3B8' : '#64748B',
      sulfur: isDark ? '#FBBF24' : '#B45309',
      hydrogen: isDark ? '#CBD5E1' : '#94A3B8',
      bond: isDark ? 'rgba(167, 181, 201, 0.22)' : 'rgba(23, 43, 58, 0.18)',
      bondActive: isDark ? 'rgba(45, 212, 191, 0.45)' : 'rgba(13, 148, 136, 0.45)',
      particle: isDark ? 'rgba(169, 154, 251, ' : 'rgba(120, 101, 213, ',
      orbitalRing: isDark ? 'rgba(45, 212, 191, 0.12)' : 'rgba(13, 148, 136, 0.12)',
    };

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Interpolate mouse parallax
      mousePos.x += (mousePos.targetX - mousePos.x) * 0.06;
      mousePos.y += (mousePos.targetY - mousePos.y) * 0.06;

      if (!prefersReducedMotion) {
        angleY += isHovered ? 0.009 : 0.005;
        angleX = 0.25 + mousePos.y * 0.35;
        angleZ += 0.0015;
      }

      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const cosY = Math.cos(angleY + mousePos.x * 0.45);
      const sinY = Math.sin(angleY + mousePos.x * 0.45);
      const cosZ = Math.cos(angleZ);
      const sinZ = Math.sin(angleZ);

      // Transform 3D point helper
      const project = (p) => {
        // Rotate around Y
        let x1 = p.x * cosY + p.z * sinY;
        let y1 = p.y;
        let z1 = -p.x * sinY + p.z * cosY;

        // Rotate around X
        let x2 = x1;
        let y2 = y1 * cosX - z1 * sinX;
        let z2 = y1 * sinX + z1 * cosX;

        // Rotate around Z
        let x3 = x2 * cosZ - y2 * sinZ;
        let y3 = x2 * sinZ + y2 * cosZ;
        let z3 = z2;

        // Perspective camera projection
        const focalLength = 320;
        const scale = focalLength / (focalLength + z3 + 120);

        return {
          x: centerX + x3 * scale,
          y: centerY + y3 * scale,
          z: z3,
          scale,
          visible: z3 > -focalLength + 20,
        };
      };

      // 1. Draw subtle orbital guide circles in 3D
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, 130 * cosX, 130, angleZ, 0, Math.PI * 2);
      ctx.strokeStyle = colors.orbitalRing;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.restore();

      // 2. Project Particles
      particles.forEach((pt) => {
        const proj = project(pt);
        if (!proj.visible) return;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, pt.size * proj.scale, 0, Math.PI * 2);
        ctx.fillStyle = `${colors.particle}${pt.alpha * proj.scale})`;
        ctx.fill();
      });

      // 3. Project Atoms
      const projectedAtoms = atoms.map((atom) => {
        const proj = project(atom);
        return {
          ...atom,
          projX: proj.x,
          projY: proj.y,
          projZ: proj.z,
          scale: proj.scale,
        };
      });

      // Sort bonds and atoms by Z depth (back-to-front painter's algorithm)
      const renderQueue = [];

      bonds.forEach(([i1, i2]) => {
        const a1 = projectedAtoms[i1];
        const a2 = projectedAtoms[i2];
        const avgZ = (a1.projZ + a2.projZ) / 2;
        renderQueue.push({
          type: 'bond',
          z: avgZ,
          a1,
          a2,
        });
      });

      projectedAtoms.forEach((atom) => {
        renderQueue.push({
          type: 'atom',
          z: atom.projZ,
          atom,
        });
      });

      renderQueue.sort((a, b) => b.z - a.z);

      // Render sorted queue
      renderQueue.forEach((item) => {
        if (item.type === 'bond') {
          const { a1, a2 } = item;
          ctx.beginPath();
          ctx.moveTo(a1.projX, a1.projY);
          ctx.lineTo(a2.projX, a2.projY);
          ctx.strokeStyle = item.z > 0 ? colors.bondActive : colors.bond;
          ctx.lineWidth = Math.max(1, 2.2 * ((a1.scale + a2.scale) / 2));
          ctx.lineCap = 'round';
          ctx.stroke();
        } else {
          const { atom } = item;
          const r = Math.max(3, atom.radius * atom.scale);
          const color = colors[atom.charge] || colors.core;

          // Radial shading for 3D sphere illusion
          const grad = ctx.createRadialGradient(
            atom.projX - r * 0.35,
            atom.projY - r * 0.35,
            r * 0.1,
            atom.projX,
            atom.projY,
            r
          );

          if (isDark) {
            grad.addColorStop(0, '#FFFFFF');
            grad.addColorStop(0.3, color);
            grad.addColorStop(1, '#070D18');
          } else {
            grad.addColorStop(0, '#FFFFFF');
            grad.addColorStop(0.35, color);
            grad.addColorStop(1, '#0B2233');
          }

          // Atom body
          ctx.beginPath();
          ctx.arc(atom.projX, atom.projY, r, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.shadowColor = color;
          ctx.shadowBlur = isDark ? (atom.id === 0 ? 16 : 8) : 4;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Outer specular stroke
          ctx.beginPath();
          ctx.arc(atom.projX, atom.projY, r, 0, Math.PI * 2);
          ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 0.75;
          ctx.stroke();

          // Element symbol label for large core atoms
          if (r > 7) {
            ctx.fillStyle = isDark ? '#FFFFFF' : '#FFFFFF';
            ctx.font = `700 ${Math.round(r * 0.85)}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(atom.element, atom.projX, atom.projY);
          }
        }
      });

      if (isVisible && !prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    if (isVisible) {
      render();
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [theme, isVisible, prefersReducedMotion, atoms, bonds, particles, mousePos, isHovered]);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    setMousePos((prev) => ({ ...prev, targetX: x, targetY: y }));
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePos((prev) => ({ ...prev, targetX: 0, targetY: 0 }));
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full aspect-square max-w-[480px] mx-auto select-none overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] shadow-[var(--shadow-raised)] transition-all duration-300 ${className}`}
    >
      {/* 3D Canvas element */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Scientific Overlay Badges */}
      <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-surface-ground)]/90 backdrop-blur-md border border-[var(--color-border-subtle)] text-[11px] font-mono font-bold text-[var(--color-brand-primary)]">
          <Compass className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '14s' }} />
          <span>Target Pocket 3D</span>
        </div>
        <div className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--color-status-safe-bg)] border border-[var(--color-status-safe-border)] text-[10px] font-mono font-semibold text-[var(--color-status-safe-text)]">
          <ShieldCheck className="w-3 h-3" />
          <span>Interactive</span>
        </div>
      </div>

      {/* Interactive Bottom Bar */}
      <div className="absolute bottom-3 inset-x-3 p-2.5 rounded-xl bg-[var(--color-surface-ground)]/92 backdrop-blur-md border border-[var(--color-border-subtle)] flex items-center justify-between text-xs pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--color-brand-primary)] animate-pulse" />
          <span className="font-mono text-[11px] text-[var(--color-text-secondary)] font-medium">
            PDB-7X81 Binding Simulation
          </span>
        </div>
        <span className="font-mono text-[10px] font-bold text-[var(--color-brand-text)] bg-[var(--color-brand-surface)] px-2 py-0.5 rounded border border-[var(--color-brand-border)]">
          ΔG: -9.4 kcal/mol
        </span>
      </div>

      {/* Fallback for screen readers */}
      <div className="sr-only">
        Interactive 3D molecular visualization showing a candidate ligand docked in a receptor binding pocket.
      </div>
    </div>
  );
}
