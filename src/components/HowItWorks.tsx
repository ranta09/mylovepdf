import { motion } from "framer-motion";

const steps = [
  { step: "1", title: "Choose a Tool", desc: "Pick from 35+ PDF and AI tools — merge, split, compress, convert, edit, summarize, and more." },
  { step: "2", title: "Upload Your File", desc: "Drag and drop your PDF or document. All processing happens securely in your browser." },
  { step: "3", title: "Download Result", desc: "Get your processed file instantly. No waiting, no queues, no watermarks." },
];

const HowItWorks = () => (
  <section className="border-t border-border bg-secondary/20 py-16">
    <div className="container">
      <h2 className="font-display text-2xl font-bold text-foreground text-center mb-2 md:text-3xl">
        How MagicPDF Works
      </h2>
      <p className="text-center text-muted-foreground mb-14">
        Three simple steps to work with any PDF
      </p>

      {/* Desktop: horizontal pipe */}
      <div className="hidden md:block relative max-w-3xl mx-auto">
        {/* Pipe track */}
        <div className="absolute top-7 left-[calc(16.66%+28px)] right-[calc(16.66%+28px)] h-2 rounded-full bg-muted border border-border overflow-hidden">
          {/* Liquid fill */}
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.6))" }}
            initial={{ width: "0%" }}
            whileInView={{ width: "100%" }}
            viewport={{ once: true }}
            transition={{ duration: 1.8, ease: "easeInOut", delay: 0.3 }}
          />
          {/* Flowing bubbles */}
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="absolute top-1/2 -translate-y-1/2 h-1.5 w-4 rounded-full bg-primary-foreground/30"
              animate={{ left: ["-10%", "110%"] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.7, ease: "linear" }}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-8 relative">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.3 + 0.2, duration: 0.5 }}
              className="flex flex-col items-center gap-3 text-center"
            >
              {/* Node on pipe */}
              <div className="relative z-10">
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary/20"
                  animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }}
                />
                <motion.div
                  className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-lg font-bold shadow-lg ring-4 ring-background"
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.3, type: "spring", stiffness: 300, damping: 15 }}
                >
                  {s.step}
                </motion.div>
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mt-1">{s.title}</h3>
              <p className="text-sm text-muted-foreground max-w-[220px]">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Mobile: vertical pipe */}
      <div className="md:hidden relative max-w-xs mx-auto">
        {/* Vertical pipe track */}
        <div className="absolute left-7 top-7 bottom-7 w-2 rounded-full bg-muted border border-border overflow-hidden">
          <motion.div
            className="absolute inset-x-0 top-0 rounded-full"
            style={{ background: "linear-gradient(180deg, hsl(var(--primary)), hsl(var(--primary) / 0.6))" }}
            initial={{ height: "0%" }}
            whileInView={{ height: "100%" }}
            viewport={{ once: true }}
            transition={{ duration: 1.8, ease: "easeInOut", delay: 0.3 }}
          />
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="absolute left-1/2 -translate-x-1/2 w-1.5 h-4 rounded-full bg-primary-foreground/30"
              animate={{ top: ["-10%", "110%"] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.7, ease: "linear" }}
            />
          ))}
        </div>

        <div className="flex flex-col gap-10 relative">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.25, duration: 0.5 }}
              className="flex items-start gap-5"
            >
              <div className="relative z-10 shrink-0">
                <motion.div
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-lg font-bold shadow-lg ring-4 ring-background"
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.25, type: "spring", stiffness: 300, damping: 15 }}
                >
                  {s.step}
                </motion.div>
              </div>
              <div className="pt-2">
                <h3 className="font-display text-lg font-semibold text-foreground">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default HowItWorks;
