import React, { useEffect, useRef } from 'react';

/**
 * Premium Golden ASCII Ambient Canvas Background
 * Micro geometric terminal motif (crosshairs, micro-dots, subtle matrix glyphs)
 * Discreet, small (7-9px), soft transparency (0.12 - 0.30), smooth mouse parallax
 */
export default function AsciiStarsBackground({
  count = 260,
  speed = 0.6,
  accentColor = '#C99355', // Soft warm gold
  baseColor = '#BC8961',   // Brokex signature gold
  dimColor = '#7A5B3D'     // Subtle muted bronze
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

    // Geometric micro-motif: crosshairs, micro-dots, subtle geometric markers
    const CHARS = ['+', '·', '×', '°', '▫', '·', ':', '·'];

    let points = [];

    const initPoints = () => {
      points = [];
      const currentWidth = width || window.innerWidth;
      const currentHeight = height || window.innerHeight;

      for (let i = 0; i < count; i++) {
        const isAccent = Math.random() < 0.20; // 20% accent
        const isMedium = Math.random() < 0.50; // 50% medium
        
        points.push({
          x: Math.random() * currentWidth,
          y: Math.random() * currentHeight,
          z: Math.random() * 0.75 + 0.25, // depth
          char: CHARS[Math.floor(Math.random() * CHARS.length)],
          // Small discreet sizes: 6.5px to 9px
          size: Math.floor(Math.random() * 3 + 7),
          color: isAccent ? accentColor : isMedium ? baseColor : dimColor,
          // Soft transparency: base between 0.10 and 0.22
          baseAlpha: isAccent ? (Math.random() * 0.08 + 0.18) : (Math.random() * 0.08 + 0.10),
          twinkleSpeed: Math.random() * 1.6 + 0.6,
          phase: Math.random() * Math.PI * 2,
          vx: (Math.random() - 0.5) * 0.10,
          vy: (Math.random() - 0.5) * 0.10
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
      mouse.x += (mouse.targetX - mouse.x) * 0.04;
      mouse.y += (mouse.targetY - mouse.y) * 0.04;

      const mouseShiftX = (mouse.x - 0.5) * 30;
      const mouseShiftY = (mouse.y - 0.5) * 30;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const tSec = (time / 1000) * speed;

      for (let i = 0; i < points.length; i++) {
        const pt = points[i];

        // Drift
        pt.x += (pt.vx + (mouse.x - 0.5) * 0.06) * pt.z;
        pt.y += (pt.vy + (mouse.y - 0.5) * 0.06) * pt.z;

        // Wrap edges
        if (pt.x < -15) pt.x = width + 15;
        if (pt.x > width + 15) pt.x = -15;
        if (pt.y < -15) pt.y = height + 15;
        if (pt.y > height + 15) pt.y = -15;

        // Parallax position
        const drawX = pt.x + mouseShiftX * pt.z;
        const drawY = pt.y + mouseShiftY * pt.z;

        // Subtle organic breathing twinkle (never too bright, capped around 0.32 max)
        const twinkle = Math.sin(tSec * pt.twinkleSpeed + pt.phase);
        const alpha = Math.max(0.08, Math.min(0.32, pt.baseAlpha + twinkle * 0.08));

        ctx.font = `${pt.size}px "Source Code Pro", "Courier New", monospace`;
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = alpha;

        ctx.fillText(pt.char, drawX, drawY);
      }

      ctx.globalAlpha = 1;

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
