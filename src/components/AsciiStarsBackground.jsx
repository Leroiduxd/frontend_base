import React, { useEffect, useRef } from 'react';

/**
 * Premium Golden ASCII Terminal/Code Ambient Canvas Background
 * Pure computing and mathematical keyboard symbols: +, -, /, %, #, @, ", ', =, ~, &, |, <, >, $, etc.
 * Zero stars. Controlled count (200), increased size (13-17px), balanced golden opacity (0.25 - 0.65).
 */
export default function AsciiStarsBackground({
  count = 200,
  speed = 0.6,
  accentColor = '#F5C869', // Bright rich gold
  baseColor = '#E5A93C',   // Warm golden bronze
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
        const isAccent = Math.random() < 0.28;
        const isMedium = Math.random() < 0.52;
        
        points.push({
          x: Math.random() * currentWidth,
          y: Math.random() * currentHeight,
          z: Math.random() * 0.75 + 0.25, // depth multiplier
          char: CHARS[Math.floor(Math.random() * CHARS.length)],
          isAccent,
          // Slightly enlarged size: 13px to 17px
          size: isAccent ? Math.floor(Math.random() * 3 + 15) : Math.floor(Math.random() * 3 + 13),
          color: isAccent ? accentColor : isMedium ? baseColor : dimColor,
          // Slightly increased opacity: base between 0.32 and 0.55
          baseAlpha: isAccent ? (Math.random() * 0.12 + 0.45) : (Math.random() * 0.10 + 0.32),
          twinkleSpeed: Math.random() * 1.5 + 0.6,
          phase: Math.random() * Math.PI * 2,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.12
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

      const mouseShiftX = (mouse.x - 0.5) * 28;
      const mouseShiftY = (mouse.y - 0.5) * 28;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 0; // Flat clean terminal aesthetic

      const tSec = (time / 1000) * speed;

      for (let i = 0; i < points.length; i++) {
        const pt = points[i];

        // Drift
        pt.x += (pt.vx + (mouse.x - 0.5) * 0.06) * pt.z;
        pt.y += (pt.vy + (mouse.y - 0.5) * 0.06) * pt.z;

        // Wrap edges
        if (pt.x < -20) pt.x = width + 20;
        if (pt.x > width + 20) pt.x = -20;
        if (pt.y < -20) pt.y = height + 20;
        if (pt.y > height + 20) pt.y = -20;

        // Parallax position
        const drawX = pt.x + mouseShiftX * pt.z;
        const drawY = pt.y + mouseShiftY * pt.z;

        // Clean breathing twinkle: range 0.24 to 0.65
        const twinkle = Math.sin(tSec * pt.twinkleSpeed + pt.phase);
        const alpha = Math.max(0.24, Math.min(0.65, pt.baseAlpha + twinkle * 0.10));

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
