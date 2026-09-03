import React, { useEffect, useRef } from 'react';

/**
 * Premium Golden ASCII Terminal/Code Ambient Canvas Background
 * Pure computing and mathematical keyboard symbols: +, -, /, %, #, @, ", ', =, ~, &, |, <, >, $, etc.
 * Zero stars. Reduced density (120), discreet size (10-13px), soft reduced opacity (0.10 - 0.35).
 */
export default function AsciiStarsBackground({
  count = 120,
  speed = 0.5,
  accentColor = '#E5A93C', // Warm gold
  baseColor = '#BC8961',   // Brokex signature gold
  dimColor = '#8A6746'     // Subtle muted bronze
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

    // Pure computing & mathematical keyboard symbols — ZERO stars
    const CHARS = [
      '+', '-', '/', '%', '#', '@', '"', "'", '=', '~',
      '&', '|', '<', '>', '^', '!', '?', '$', '{', '}',
      '[', ']', ';', ':', '_'
    ];

    let points = [];

    const initPoints = () => {
      points = [];
      const currentWidth = width || window.innerWidth;
      const currentHeight = height || window.innerHeight;

      for (let i = 0; i < count; i++) {
        const isAccent = Math.random() < 0.25;
        const isMedium = Math.random() < 0.55;
        
        points.push({
          x: Math.random() * currentWidth,
          y: Math.random() * currentHeight,
          z: Math.random() * 0.75 + 0.25, // depth multiplier
          char: CHARS[Math.floor(Math.random() * CHARS.length)],
          isAccent,
          // Restored small sizes: 10px to 13px
          size: isAccent ? Math.floor(Math.random() * 2 + 12) : Math.floor(Math.random() * 2 + 10),
          color: isAccent ? accentColor : isMedium ? baseColor : dimColor,
          // Reduced soft opacity: base between 0.14 and 0.28
          baseAlpha: isAccent ? (Math.random() * 0.08 + 0.22) : (Math.random() * 0.06 + 0.14),
          twinkleSpeed: Math.random() * 1.5 + 0.6,
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

      const mouseShiftX = (mouse.x - 0.5) * 25;
      const mouseShiftY = (mouse.y - 0.5) * 25;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 0; // Flat clean terminal aesthetic

      const tSec = (time / 1000) * speed;

      for (let i = 0; i < points.length; i++) {
        const pt = points[i];

        // Drift
        pt.x += (pt.vx + (mouse.x - 0.5) * 0.05) * pt.z;
        pt.y += (pt.vy + (mouse.y - 0.5) * 0.05) * pt.z;

        // Wrap edges
        if (pt.x < -20) pt.x = width + 20;
        if (pt.x > width + 20) pt.x = -20;
        if (pt.y < -20) pt.y = height + 20;
        if (pt.y > height + 20) pt.y = -20;

        // Parallax position
        const drawX = pt.x + mouseShiftX * pt.z;
        const drawY = pt.y + mouseShiftY * pt.z;

        // Reduced soft breathing twinkle: range 0.10 to 0.35
        const twinkle = Math.sin(tSec * pt.twinkleSpeed + pt.phase);
        const alpha = Math.max(0.10, Math.min(0.35, pt.baseAlpha + twinkle * 0.07));

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
