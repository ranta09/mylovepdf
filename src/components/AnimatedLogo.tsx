import { motion } from "framer-motion";

const fileIcons = [
  { label: "PDF", color: "hsl(0, 72%, 51%)", x: -18, delay: 1.2 },
  { label: "DOC", color: "hsl(221, 83%, 53%)", x: 0, delay: 1.5 },
  { label: "TXT", color: "hsl(142, 71%, 45%)", x: 18, delay: 1.8 },
];

const sparkles = [
  { cx: 6, cy: 4, r: 1.2, delay: 0.8 },
  { cx: 38, cy: 6, r: 0.9, delay: 1.0 },
  { cx: 12, cy: 10, r: 0.7, delay: 1.3 },
  { cx: 34, cy: 14, r: 1.0, delay: 0.9 },
  { cx: 22, cy: 2, r: 0.8, delay: 1.1 },
  { cx: 28, cy: 8, r: 1.1, delay: 1.4 },
];

const AnimatedLogo = ({ size = 56 }: { size?: number }) => {
  const s = size / 56;

  return (
    <div className="relative" style={{ width: size, height: size, overflow: "visible" }}>
      <svg
        viewBox="0 0 56 56"
        width={size}
        height={size}
        fill="none"
        style={{ overflow: "visible" }}
      >
        {/* === Hat === */}
        {/* Hat body (trapezoid) */}
        <motion.path
          d="M10 44 H46 L42 34 H14 Z"
          fill="hsl(262, 83%, 20%)"
          stroke="hsl(262, 60%, 40%)"
          strokeWidth="0.8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        />
        {/* Hat brim */}
        <motion.rect
          x="6" y="43" width="44" height="5" rx="2.5"
          fill="hsl(262, 80%, 25%)"
          stroke="hsl(262, 60%, 42%)"
          strokeWidth="0.6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        />
        {/* Hat band (gold ribbon) */}
        <motion.rect
          x="14" y="33" width="28" height="2.5" rx="1"
          fill="hsl(45, 93%, 55%)"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          style={{ transformOrigin: "center" }}
        />
        {/* Hat top cone */}
        <motion.path
          d="M18 34 L22 14 H34 L38 34 Z"
          fill="hsl(262, 78%, 18%)"
          stroke="hsl(262, 60%, 38%)"
          strokeWidth="0.8"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        />
        {/* Hat top cap */}
        <motion.rect
          x="20" y="12.5" width="16" height="3" rx="1.5"
          fill="hsl(262, 80%, 22%)"
          stroke="hsl(262, 60%, 40%)"
          strokeWidth="0.6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        />

        {/* === Sparkle particles === */}
        {sparkles.map((sp, i) => (
          <motion.circle
            key={i}
            cx={sp.cx + 6}
            cy={sp.cy + 6}
            r={sp.r}
            fill="hsl(45, 95%, 65%)"
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0.6, 1, 0],
              scale: [0, 1.3, 0.8, 1.2, 0],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              delay: sp.delay,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* === 4-point star sparkles === */}
        <motion.path
          d="M8 18 L9 15 L10 18 L13 19 L10 20 L9 23 L8 20 L5 19 Z"
          fill="hsl(45, 95%, 70%)"
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0.3, 1, 0],
            scale: [0, 1, 0.7, 1.1, 0],
            rotate: [0, 15, -10, 5, 0],
          }}
          transition={{ duration: 3, repeat: Infinity, delay: 0.6 }}
          style={{ transformOrigin: "9px 19px" }}
        />
        <motion.path
          d="M42 16 L43 13.5 L44 16 L46.5 17 L44 18 L43 20.5 L42 18 L39.5 17 Z"
          fill="hsl(195, 90%, 65%)"
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 0.8, 0.3, 1, 0],
            scale: [0, 1.2, 0.6, 1, 0],
            rotate: [0, -10, 15, -5, 0],
          }}
          transition={{ duration: 2.8, repeat: Infinity, delay: 1.0 }}
          style={{ transformOrigin: "43px 17px" }}
        />
      </svg>

      {/* === Wand (hovering above hat, waves/taps) === */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: -8 * s,
          right: -6 * s,
          width: 32 * s,
          height: 32 * s,
        }}
        initial={{ opacity: 0, y: -15, rotate: -30 }}
        animate={{
          opacity: 1,
          y: [-6, 0, -3, 2, -6],
          rotate: [-15, -5, -12, -2, -15],
        }}
        transition={{
          opacity: { duration: 0.5, delay: 0.4 },
          y: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        <svg viewBox="0 0 32 32" fill="none" style={{ width: "100%", height: "100%", overflow: "visible" }}>
          {/* Wand body */}
          <line x1="6" y1="28" x2="24" y2="6" stroke="hsl(25, 25%, 20%)" strokeWidth="3" strokeLinecap="round" />
          <line x1="6" y1="28" x2="24" y2="6" stroke="hsl(25, 35%, 42%)" strokeWidth="1.8" strokeLinecap="round" />
          {/* Wand tip glow */}
          <motion.circle
            cx="24" cy="6" r="2.5"
            fill="hsl(45, 95%, 65%)"
            animate={{
              r: [2, 3.5, 2],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.circle
            cx="24" cy="6" r="5"
            fill="none"
            stroke="hsl(45, 90%, 70%)"
            strokeWidth="0.5"
            animate={{
              r: [3, 7, 3],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
      </motion.div>

      {/* === File icons floating up from hat === */}
      {fileIcons.map((file) => (
        <motion.div
          key={file.label}
          className="absolute pointer-events-none flex items-center justify-center rounded font-bold shadow-lg"
          style={{
            fontSize: 5.5 * s,
            width: 15 * s,
            height: 11 * s,
            backgroundColor: file.color,
            color: "white",
            left: `calc(50% + ${file.x * s}px - ${7.5 * s}px)`,
            bottom: 14 * s,
            borderRadius: 2 * s,
          }}
          initial={{ opacity: 0, y: 0, scale: 0.3 }}
          animate={{
            y: [0, -20 * s, -28 * s, -24 * s],
            opacity: [0, 0.9, 1, 0],
            scale: [0.3, 1, 0.95, 0.6],
            x: [0, file.x * 0.3 * s, file.x * 0.5 * s, file.x * 0.2 * s],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: file.delay,
            ease: "easeOut",
          }}
        >
          <div className="flex flex-col items-center leading-none">
            <svg width={8 * s} height={5 * s} viewBox="0 0 10 7" fill="none" style={{ marginBottom: 0.5 * s }}>
              <rect x="0.5" y="0.5" width="9" height="6" rx="0.8" fill="white" fillOpacity="0.3" stroke="white" strokeWidth="0.4" />
              <path d="M7 0.5 L7 2.5 L9.5 2.5" stroke="white" strokeWidth="0.3" fill="white" fillOpacity="0.15" />
            </svg>
            <span style={{ lineHeight: 1, letterSpacing: "0.02em" }}>{file.label}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default AnimatedLogo;
