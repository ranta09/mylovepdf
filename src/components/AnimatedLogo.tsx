import { motion } from "framer-motion";

const files = [
  { label: "PDF", color: "#DC2626", delay: 0 },
  { label: "DOC", color: "#2563EB", delay: 0.7 },
  { label: "TXT", color: "#16A34A", delay: 1.4 },
];

const AnimatedLogo = ({ size = 56 }: { size?: number }) => {
  const scale = size / 56;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 56 56"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Magic Hat */}
        <path
          d="M14 40 H42 Q44 40 44 38 L40 30 H16 L12 38 Q12 40 14 40Z"
          fill="hsl(262, 80%, 30%)"
          stroke="hsl(262, 70%, 45%)"
          strokeWidth="1"
        />
        {/* Hat brim */}
        <rect x="8" y="38" width="40" height="5" rx="2.5" fill="hsl(262, 80%, 35%)" stroke="hsl(262, 70%, 50%)" strokeWidth="0.8" />
        {/* Hat band */}
        <rect x="16" y="30" width="24" height="3" rx="1" fill="hsl(45, 90%, 55%)" />
        {/* Hat top */}
        <path
          d="M20 30 L24 12 H32 L36 30Z"
          fill="hsl(262, 75%, 25%)"
          stroke="hsl(262, 70%, 45%)"
          strokeWidth="1"
        />
        {/* Hat top cap */}
        <rect x="22" y="11" width="12" height="3" rx="1.5" fill="hsl(262, 80%, 30%)" stroke="hsl(262, 70%, 45%)" strokeWidth="0.8" />
      </svg>

      {/* Wand hovering over hat */}
      <motion.div
        className="absolute"
        style={{ top: -2 * scale, right: -2 * scale }}
        animate={{
          y: [-2, 2, -2],
          rotate: [-8, -5, -8],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg width={28 * scale} height={28 * scale} viewBox="0 0 28 28" fill="none">
          {/* Wand stick */}
          <line x1="4" y1="24" x2="20" y2="8" stroke="hsl(30, 30%, 25%)" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="4" y1="24" x2="20" y2="8" stroke="hsl(30, 40%, 45%)" strokeWidth="1.5" strokeLinecap="round" />
          {/* Wand tip */}
          <circle cx="20" cy="8" r="2" fill="hsl(45, 95%, 65%)" />
          {/* Sparkles */}
          <motion.g
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <path d="M22 4 L22.5 2 L23 4 L25 4.5 L23 5 L22.5 7 L22 5 L20 4.5Z" fill="hsl(45, 95%, 65%)" />
          </motion.g>
          <motion.g
            animate={{ opacity: [1, 0.3, 1], scale: [1, 0.7, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          >
            <path d="M25 9 L25.3 7.5 L25.6 9 L27 9.3 L25.6 9.6 L25.3 11 L25 9.6 L23.5 9.3Z" fill="hsl(195, 90%, 65%)" />
          </motion.g>
          <motion.g
            animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.1, 0.9] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
          >
            <circle cx="18" cy="5" r="1" fill="hsl(45, 90%, 75%)" />
          </motion.g>
        </svg>
      </motion.div>

      {/* Files floating up from hat */}
      {files.map((file, i) => (
        <motion.div
          key={file.label}
          className="absolute flex items-center justify-center rounded-sm text-white font-bold shadow-md"
          style={{
            fontSize: 5 * scale,
            width: 16 * scale,
            height: 10 * scale,
            backgroundColor: file.color,
            left: (14 + i * 8) * scale,
            bottom: 18 * scale,
          }}
          animate={{
            y: [0, -22 * scale, -30 * scale],
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0.7],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            delay: file.delay,
            ease: "easeOut",
          }}
        >
          {file.label}
        </motion.div>
      ))}
    </div>
  );
};

export default AnimatedLogo;
