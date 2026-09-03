import React, { useEffect, useRef } from 'react';

/**
 * Premium Golden ASCII Ambient Canvas Background
 * Micro geometric terminal motif (crosshairs, data dots, subtle matrix glyphs)
 * Enhanced size (10-15px), reinforced golden colors, clean visibility, smooth mouse parallax
 */
export default function AsciiStarsBackground({
  count = 280,
  speed = 0.7,
  accentColor = '#FFD580', // Luminous vibrant gold
  baseColor = '#E5A93C',   // Rich warm gold
  dimColor = '#BC8961'     // Signature Brokex gold
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Mouse tracking for subtle parallax
    const mouse = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        mouse.targetX = (e.clientX - rect.left) / rect.width;
        mouse.targetY = (e.clientY - rect.top) / rect.height;
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Geometric micro-motif: crosshairs, data dots, subtle geometric markers
    const CHARS = ['+', '·', '×', '°', '▫', '·', ':', '•', '+'];

    let points = [];

    const initPoints = () => {
      points = [];
      const currentWidth = width || window.innerWidth;
      const currentHeight = height || window.innerHeight;

      for (let i = 0; i < count; i++) {
        const isAccent = Math.random() < 0.28; // 28% accent
        const isMedium = Math.random() < 0.52; // 52% medium
        
        points.push({
          x: Math.random() * currentWidth,
          y: Math.random() * currentHeight,
          z: Math.random() * 0.8 + 0.2, // depth
          char: CHARS[Math.floor(Math.random() * CHARS.length)],
          isAccent,
          // Reinforced visible sizes: 10px to 15px
          size: isAccent ? Math.floor(Math.random() * 4 + 12) : Math.floor(Math.random() * 3 + 10),
          color: isAccent ? accentColor : isMedium ? baseColor : dimColor,
          // Reinforced visible transparency: base between 0.35 and 0.65
          baseAlpha: isAccent ? (Math.random() * 0.15 + 0.55) : (Math.random() * 0.15 + 0.35),
          twinkleSpeed: Math.random() * 1.8 + 0.8,
          phase: Math.random() * Math.PI * 2,
          vx: (Math.random() - 0.5) * 0.14,
          vy: (Math.random() - 0.5) * 0.14
        });
      }
    };

    const resize = () => {
      const parent = canvas.parentElement;
      const rect = parent ? parent.getBoundingClientRect() : canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (width === 0 || height === 0) return;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      initPoints();
    };

    const resizeObserver = new ResizeObserver(resize);
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }
    resize();

    const render = (time) => {
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse lerp
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      const mouseShiftX = (mouse.x - 0.5) * 35;
      const mouseShiftY = (mouse.y - 0.5) * 35;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const tSec = (time / 1000) * speed;

      for (let i = 0; i < points.length; i++) {
        const pt = points[i];

        // Drift
        pt.x += (pt.vx + (mouse.x - 0.5) * 0.08) * pt.z;
        pt.y += (pt.vy + (mouse.y - 0.5) * 0.08) * pt.z;

        // Wrap edges
        if (pt.x < -20) pt.x = width + 20;
        if (pt.x > width + 20) pt.x = -20;
        if (pt.y < -20) pt.y = height + 20;
        if (pt.y > height + 20) pt.y = -20;

        // Parallax position
        const drawX = pt.x + mouseShiftX * pt.z;
        const drawY = pt.y + mouseShiftY * pt.z;

        // Clean breathing twinkle
        const twinkle = Math.sin(tSec * pt.twinkleSpeed + pt.phase);
        const alpha = Math.max(0.22, Math.min(0.82, pt.baseAlpha + twinkle * 0.15));

        ctx.font = `${pt.size}px "Source Code Pro", "Courier New", monospace`;
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = alpha;

        // Subtle glow on accent points
        if (pt.isAccent) {
          ctx.shadowColor = accentColor;
          ctx.shadowBlur = 4;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fillText(pt.char, drawX, drawY);
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      resizeObserver.disconnect();
    };
  }, [count, speed, accentColor, baseColor, dimColor]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0
      }}
    />
  );
}
