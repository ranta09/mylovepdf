import { motion } from "framer-motion";
import { Heart, Shield, Zap } from "lucide-react";

const features = [
  { icon: Zap, title: "Lightning Fast", desc: "Process files instantly in your browser. No waiting, no queues." },
  { icon: Shield, title: "100% Secure", desc: "Files are processed locally and automatically deleted after use." },
  { icon: Heart, title: "Completely Free", desc: "All tools are free to use with no hidden limits or sign-ups." },
];

const FeaturesSection = () => (
  <section className="border-t border-border bg-secondary/30 py-16">
    <div className="container">
      <div className="grid gap-8 md:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="flex flex-col items-center gap-3 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <f.icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
