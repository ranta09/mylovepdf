import { useEffect, useRef, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  radius: number;
  driftAngle: number;
  driftSpeed: number;
}

const NeuralBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  const initParticles = useCallback((w: number, h: number) => {
    const count = Math.floor((w * h) / 5000);
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      particles.push({
        x, y,
        baseX: x,
        baseY: y,
        vx: 0,
        vy: 0,
        radius: Math.random() * 1.8 + 0.6,
        driftAngle: Math.random() * Math.PI * 2,
        driftSpeed: Math.random() * 0.3 + 0.1,
      });
    }
    particlesRef.current = particles;
    return particles;
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
    };

    const onMouseLeave = () => {
      mouseRef.current.active = false;
    };

    // Listen on window so mouse works even over text/buttons above canvas
    window.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);

    const connectionDist = 130;
    const mouseRadius = 220;

    const draw = () => {
      timeRef.current += 0.01;
      const t = timeRef.current;
      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      ctx.clearRect(0, 0, width, height);

      // Update particles
      for (const p of particles) {
        // Natural orbital drift around base position
        const driftX = Math.cos(p.driftAngle + t * p.driftSpeed) * 20;
        const driftY = Math.sin(p.driftAngle + t * p.driftSpeed * 1.3) * 20;
        const targetX = p.baseX + driftX;
        const targetY = p.baseY + driftY;

        if (mouse.active) {
          const dxM = p.x - mouse.x;
          const dyM = p.y - mouse.y;
          const distM = Math.sqrt(dxM * dxM + dyM * dyM);

          if (distM < mouseRadius && distM > 0.1) {
            // Push away from cursor: stronger when closer
            const strength = ((mouseRadius - distM) / mouseRadius) * 3;
            p.vx += (dxM / distM) * strength;
            p.vy += (dyM / distM) * strength;
          }
        }

        // Spring back toward drifting target
        p.vx += (targetX - p.x) * 0.03;
        p.vy += (targetY - p.y) * 0.03;

        // Damping
        p.vx *= 0.9;
        p.vy *= 0.9;

        p.x += p.vx;
        p.y += p.vy;
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = dx * dx + dy * dy;
          if (dist < connectionDist * connectionDist) {
            const d = Math.sqrt(dist);
            const alpha = (1 - d / connectionDist) * 0.18;
            ctx.beginPath();
            ctx.strokeStyle = `hsla(0, 78%, 55%, ${alpha})`;
            ctx.lineWidth = 0.7;
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw mouse connections
      if (mouse.active) {
        for (const p of particles) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouseRadius) {
            const alpha = (1 - dist / mouseRadius) * 0.25;
            ctx.beginPath();
            ctx.strokeStyle = `hsla(0, 78%, 55%, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        let glow = 0.35;
        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouseRadius) {
            glow = 0.35 + (1 - dist / mouseRadius) * 0.5;
          }
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(0, 78%, 55%, ${glow})`;
        ctx.fill();
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

export default NeuralBackground;
