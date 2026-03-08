import { useEffect, useRef, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  angle: number;
  rotationSpeed: number;
  rotation: number;
  drift: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

const MagicBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });
  const particlesRef = useRef<Particle[]>([]);
  const trailRef = useRef<{ x: number; y: number; age: number; size: number }[]>([]);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  const initParticles = useCallback((w: number, h: number) => {
    const count = Math.floor((w * h) / 14000);
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 8 + 4,
        opacity: Math.random() * 0.4 + 0.08,
        speed: Math.random() * 0.3 + 0.05,
        angle: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.01,
        rotation: Math.random() * Math.PI * 2,
        drift: Math.random() * 0.5 + 0.1,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 2 + 1,
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = width;
      canvas.height = height;
      initParticles(width, height);
    };

    resize();
    window.addEventListener("resize", resize);

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      mouseRef.current.active = true;

      if (Math.random() > 0.5) {
        trailRef.current.push({
          x: mouseRef.current.x + (Math.random() - 0.5) * 20,
          y: mouseRef.current.y + (Math.random() - 0.5) * 20,
          age: 0,
          size: Math.random() * 6 + 4,
        });
      }
      if (trailRef.current.length > 30) trailRef.current.shift();
    };

    const onMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);

    const drawHeart = (cx: number, cy: number, size: number, rotation: number, fill = true) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.beginPath();
      const s = size * 0.5;
      ctx.moveTo(0, s * 0.4);
      ctx.bezierCurveTo(-s, -s * 0.3, -s, -s, 0, -s * 0.5);
      ctx.bezierCurveTo(s, -s, s, -s * 0.3, 0, s * 0.4);
      ctx.closePath();
      if (fill) {
        ctx.fill();
      } else {
        ctx.stroke();
      }
      ctx.restore();
    };

    const draw = () => {
      timeRef.current += 0.016;
      const t = timeRef.current;
      const particles = particlesRef.current;

      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.y -= p.speed;
        p.x += Math.sin(t * p.drift + p.angle) * 0.3;
        p.rotation += p.rotationSpeed;

        if (p.y < -20) { p.y = height + 20; p.x = Math.random() * width; }
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;

        const twinkle = (Math.sin(t * p.twinkleSpeed + p.twinklePhase) + 1) / 2;
        const alpha = p.opacity * (0.3 + twinkle * 0.7);

        let extraGlow = 0;
        if (mouseRef.current.active) {
          const dx = mouseRef.current.x - p.x;
          const dy = mouseRef.current.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            extraGlow = (1 - dist / 180) * 0.5;
          }
        }

        const finalAlpha = Math.min(alpha + extraGlow, 0.8);

        // Alternate between orange and red tones to match logo
        const hue = 15 + Math.sin(p.twinklePhase) * 15; // 0-30 range (red to orange)
        ctx.fillStyle = `hsla(${hue}, 85%, 60%, ${finalAlpha})`;
        drawHeart(p.x, p.y, p.size, p.rotation);
      }

      // Mouse trail hearts
      const trail = trailRef.current;
      for (let i = trail.length - 1; i >= 0; i--) {
        const tp = trail[i];
        tp.age += 0.03;
        if (tp.age > 1) { trail.splice(i, 1); continue; }
        const alpha = (1 - tp.age) * 0.6;
        const size = tp.size * (1 - tp.age * 0.5);
        ctx.fillStyle = `hsla(15, 90%, 55%, ${alpha})`;
        drawHeart(tp.x, tp.y, size, tp.age * 2);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [initParticles]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0"
    />
  );
};

export default MagicBackground;
