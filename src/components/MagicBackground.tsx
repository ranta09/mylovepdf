import { useEffect, useRef, useCallback } from "react";

interface Sparkle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  angle: number;
  rotationSpeed: number;
  rotation: number;
  type: "star" | "diamond" | "circle";
  drift: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

const MagicBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });
  const sparklesRef = useRef<Sparkle[]>([]);
  const trailRef = useRef<{ x: number; y: number; age: number; size: number }[]>([]);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  const initSparkles = useCallback((w: number, h: number) => {
    const count = Math.floor((w * h) / 12000);
    const sparkles: Sparkle[] = [];
    const types: Sparkle["type"][] = ["star", "diamond", "circle"];
    for (let i = 0; i < count; i++) {
      sparkles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.5 + 0.1,
        speed: Math.random() * 0.3 + 0.05,
        angle: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        rotation: Math.random() * Math.PI * 2,
        type: types[Math.floor(Math.random() * types.length)],
        drift: Math.random() * 0.5 + 0.1,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 2 + 1,
      });
    }
    sparklesRef.current = sparkles;
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
      initSparkles(width, height);
    };

    resize();
    window.addEventListener("resize", resize);

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      mouseRef.current.active = true;

      // Add trail sparkles
      if (Math.random() > 0.5) {
        trailRef.current.push({
          x: mouseRef.current.x + (Math.random() - 0.5) * 20,
          y: mouseRef.current.y + (Math.random() - 0.5) * 20,
          age: 0,
          size: Math.random() * 4 + 2,
        });
      }
      if (trailRef.current.length > 30) trailRef.current.shift();
    };

    const onMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);

    const drawStar = (cx: number, cy: number, size: number, rotation: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2;
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
      }
      ctx.stroke();
      // Cross sparkle
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2 + Math.PI / 4;
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * size * 0.5, Math.sin(angle) * size * 0.5);
      }
      ctx.stroke();
      ctx.restore();
    };

    const drawDiamond = (cx: number, cy: number, size: number, rotation: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.6, 0);
      ctx.lineTo(0, size);
      ctx.lineTo(-size * 0.6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const draw = () => {
      timeRef.current += 0.016;
      const t = timeRef.current;
      const sparkles = sparklesRef.current;

      ctx.clearRect(0, 0, width, height);

      // Draw floating sparkles
      for (const s of sparkles) {
        s.y -= s.speed;
        s.x += Math.sin(t * s.drift + s.angle) * 0.3;
        s.rotation += s.rotationSpeed;

        // Wrap around
        if (s.y < -10) { s.y = height + 10; s.x = Math.random() * width; }
        if (s.x < -10) s.x = width + 10;
        if (s.x > width + 10) s.x = -10;

        const twinkle = (Math.sin(t * s.twinkleSpeed + s.twinklePhase) + 1) / 2;
        const alpha = s.opacity * (0.3 + twinkle * 0.7);

        // Proximity glow near mouse
        let extraGlow = 0;
        if (mouseRef.current.active) {
          const dx = mouseRef.current.x - s.x;
          const dy = mouseRef.current.y - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            extraGlow = (1 - dist / 180) * 0.6;
          }
        }

        const finalAlpha = Math.min(alpha + extraGlow, 1);

        if (s.type === "star") {
          ctx.strokeStyle = `hsla(270, 60%, 65%, ${finalAlpha})`;
          ctx.lineWidth = 0.8;
          drawStar(s.x, s.y, s.size * 2, s.rotation);
        } else if (s.type === "diamond") {
          ctx.fillStyle = `hsla(215, 80%, 65%, ${finalAlpha})`;
          drawDiamond(s.x, s.y, s.size * 1.5, s.rotation);
        } else {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size * 0.8, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(45, 90%, 70%, ${finalAlpha})`;
          ctx.fill();
        }
      }

      // Draw mouse trail sparkles
      const trail = trailRef.current;
      for (let i = trail.length - 1; i >= 0; i--) {
        const tp = trail[i];
        tp.age += 0.03;
        if (tp.age > 1) { trail.splice(i, 1); continue; }
        const alpha = (1 - tp.age) * 0.7;
        const size = tp.size * (1 - tp.age * 0.5);
        ctx.strokeStyle = `hsla(270, 70%, 70%, ${alpha})`;
        ctx.lineWidth = 1;
        drawStar(tp.x, tp.y, size, tp.age * 3);
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
  }, [initSparkles]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-10"
    />
  );
};

export default MagicBackground;
