import { useEffect, useRef, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  radius: number;
}

const NeuralBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);

  const initParticles = useCallback((w: number, h: number) => {
    const count = Math.floor((w * h) / 6000);
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      particles.push({
        x,
        y,
        baseX: x,
        baseY: y,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 1.5 + 0.8,
      });
    }
    return particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      particlesRef.current = initParticles(canvas.width, canvas.height);
    };

    resize();
    window.addEventListener("resize", resize);

    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, active: true };
    };

    const handleLeave = () => {
      mouseRef.current = { ...mouseRef.current, active: false };
    };

    canvas.addEventListener("mousemove", handleMouse);
    canvas.addEventListener("mouseleave", handleLeave);

    const connectionDist = 120;
    const mouseDist = 250;
    const pushForce = 0.08;
    const returnForce = 0.01;
    const driftSpeed = 0.3;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        if (mouse.active) {
          // Push particles away from cursor
          const dxM = p.x - mouse.x;
          const dyM = p.y - mouse.y;
          const distM = Math.sqrt(dxM * dxM + dyM * dyM);
          if (distM < mouseDist && distM > 1) {
            const force = (1 - distM / mouseDist) * pushForce;
            p.vx += (dxM / distM) * force;
            p.vy += (dyM / distM) * force;
          }
        }

        // Gentle return to base position when not near cursor
        const dxBase = p.baseX - p.x;
        const dyBase = p.baseY - p.y;
        p.vx += dxBase * returnForce;
        p.vy += dyBase * returnForce;

        // Natural drift
        p.vx += (Math.random() - 0.5) * driftSpeed * 0.05;
        p.vy += (Math.random() - 0.5) * driftSpeed * 0.05;

        // Damping
        p.vx *= 0.95;
        p.vy *= 0.95;

        p.x += p.vx;
        p.y += p.vy;

        // Wrap
        if (p.x < -10) { p.x = w + 10; p.baseX = p.x; }
        if (p.x > w + 10) { p.x = -10; p.baseX = p.x; }
        if (p.y < -10) { p.y = h + 10; p.baseY = p.y; }
        if (p.y > h + 10) { p.y = -10; p.baseY = p.y; }
      }

      // Draw connections between particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < connectionDist) {
            const alpha = (1 - dist / connectionDist) * 0.15;
            ctx.beginPath();
            ctx.strokeStyle = `hsla(0, 78%, 55%, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(0, 78%, 55%, 0.45)`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouse);
      canvas.removeEventListener("mouseleave", handleLeave);
    };
  }, [initParticles]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0"
      style={{ pointerEvents: "auto" }}
    />
  );
};

export default NeuralBackground;
