import { useEffect, useRef, useCallback } from "react";

interface Sparkle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  angle: number;
  rotation: number;
  type: number; // 0=star, 1=diamond, 2=circle
  drift: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

const MagicBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparklesRef = useRef<Sparkle[]>([]);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  const initSparkles = useCallback((w: number, h: number) => {
    // Reduced count significantly for performance
    const count = Math.min(Math.floor((w * h) / 25000), 80);
    const sparkles: Sparkle[] = [];
    for (let i = 0; i < count; i++) {
      sparkles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 2.5 + 1,
        opacity: Math.random() * 0.4 + 0.1,
        speed: Math.random() * 0.2 + 0.05,
        angle: Math.random() * Math.PI * 2,
        rotation: Math.random() * Math.PI * 2,
        type: Math.floor(Math.random() * 3),
        drift: Math.random() * 0.4 + 0.1,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 1.5 + 0.5,
      });
    }
    sparklesRef.current = sparkles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      // Use lower resolution for performance
      const dpr = Math.min(window.devicePixelRatio, 1);
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.scale(dpr, dpr);
      initSparkles(width, height);
    };

    resize();
    window.addEventListener("resize", resize);

    let lastFrame = 0;
    const TARGET_FPS = 24; // Lower FPS for background effect
    const FRAME_INTERVAL = 1000 / TARGET_FPS;

    const draw = (timestamp: number) => {
      animRef.current = requestAnimationFrame(draw);

      const delta = timestamp - lastFrame;
      if (delta < FRAME_INTERVAL) return;
      lastFrame = timestamp - (delta % FRAME_INTERVAL);

      timeRef.current += 0.02;
      const t = timeRef.current;
      const sparkles = sparklesRef.current;

      ctx.clearRect(0, 0, width, height);

      for (const s of sparkles) {
        s.y -= s.speed;
        s.x += Math.sin(t * s.drift + s.angle) * 0.2;
        s.rotation += 0.01;

        if (s.y < -10) { s.y = height + 10; s.x = Math.random() * width; }
        if (s.x < -10) s.x = width + 10;
        if (s.x > width + 10) s.x = -10;

        const twinkle = (Math.sin(t * s.twinkleSpeed + s.twinklePhase) + 1) / 2;
        const alpha = s.opacity * (0.3 + twinkle * 0.7);

        if (s.type === 0) {
          // Simple cross instead of complex star
          ctx.strokeStyle = `hsla(270, 60%, 65%, ${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          const sz = s.size * 1.5;
          ctx.moveTo(s.x - sz, s.y);
          ctx.lineTo(s.x + sz, s.y);
          ctx.moveTo(s.x, s.y - sz);
          ctx.lineTo(s.x, s.y + sz);
          ctx.stroke();
        } else if (s.type === 1) {
          ctx.fillStyle = `hsla(215, 80%, 65%, ${alpha})`;
          const sz = s.size;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y - sz);
          ctx.lineTo(s.x + sz * 0.6, s.y);
          ctx.lineTo(s.x, s.y + sz);
          ctx.lineTo(s.x - sz * 0.6, s.y);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size * 0.7, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(45, 90%, 70%, ${alpha})`;
          ctx.fill();
        }
      }
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [initSparkles]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-10"
    />
  );
};

export default MagicBackground;
