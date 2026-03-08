import { motion } from "framer-motion";

const steps = [
  { step: "1", title: "Choose a Tool", desc: "Pick from 35+ PDF and AI tools — merge, split, compress, convert, edit, summarize, and more." },
  { step: "2", title: "Upload Your File", desc: "Drag and drop your PDF or document. All processing happens securely in your browser." },
  { step: "3", title: "Download Result", desc: "Get your processed file instantly. No waiting, no queues, no watermarks." },
];

const FlowingLine = () => (
  <div className="hidden md:flex items-center justify-center flex-1 relative h-12">
    <svg className="w-full h-12 overflow-visible" viewBox="0 0 200 40" preserveAspectRatio="none">
      {/* Base line */}
      <path
        d="M 0 20 Q 50 5, 100 20 Q 150 35, 200 20"
        fill="none"
        stroke="hsl(var(--primary) / 0.15)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Animated flowing line */}
      <motion.path
        d="M 0 20 Q 50 5, 100 20 Q 150 35, 200 20"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
      />
      {/* Animated droplet/glow traveling along the path */}
      <motion.circle
        r="4"
        fill="hsl(var(--primary))"
        filter="url(#glow)"
        initial={{ offsetDistance: "0%" }}
        whileInView={{ offsetDistance: "100%" }}
        viewport={{ once: true }}
        transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 2 }}
        style={{ offsetPath: "path('M 0 20 Q 50 5, 100 20 Q 150 35, 200 20')" } as any}
      />
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  </div>
);

const HowItWorks = () => (
  <section className="border-t border-border bg-secondary/20 py-16">
    <div className="container">
      <h2 className="font-display text-2xl font-bold text-foreground text-center mb-2 md:text-3xl">
        How MagicPDF Works
      </h2>
      <p className="text-center text-muted-foreground mb-10">
        Three simple steps to work with any PDF
      </p>

      <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-0">
        {steps.map((s, i) => (
          <div key={i} className="flex flex-col md:flex-row items-center flex-1 w-full">
            {/* Step card */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.25, duration: 0.5, ease: "easeOut" }}
              className="flex flex-col items-center gap-3 text-center flex-1 relative"
            >
              {/* Ripple ring */}
              <div className="relative">
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary/20"
                  initial={{ scale: 1, opacity: 0 }}
                  whileInView={{ scale: [1, 1.8, 2.2], opacity: [0, 0.4, 0] }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.25 + 0.3, duration: 1.2, ease: "easeOut" }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary/10"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                />
                <motion.div
                  className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-lg font-bold shadow-lg"
                  whileHover={{ scale: 1.1, boxShadow: "0 0 20px hsl(var(--primary) / 0.5)" }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {s.step}
                </motion.div>
              </div>

              <h3 className="font-display text-lg font-semibold text-foreground">{s.title}</h3>
              <p className="text-sm text-muted-foreground max-w-[220px]">{s.desc}</p>
            </motion.div>

            {/* Flowing connector between steps */}
            {i < steps.length - 1 && <FlowingLine />}

            {/* Mobile vertical connector */}
            {i < steps.length - 1 && (
              <div className="flex md:hidden flex-col items-center my-2">
                <motion.div
                  className="w-0.5 h-8 bg-primary/20 relative overflow-hidden rounded-full"
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.25 + 0.2, duration: 0.4 }}
                  style={{ transformOrigin: "top" }}
                >
                  <motion.div
                    className="absolute inset-x-0 w-full h-3 bg-primary rounded-full"
                    animate={{ top: ["-12px", "32px"] }}
                    transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                  />
                </motion.div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorks;
