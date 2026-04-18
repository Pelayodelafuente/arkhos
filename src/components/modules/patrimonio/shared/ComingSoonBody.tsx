"use client";

import { motion } from "framer-motion";

interface ComingSoonBodyProps {
  platformName: string;
  color: string;
  colorHex: string;
  type: string;
  progress: number;
  features: string[];
}

const featureVariants = {
  hidden: { opacity: 0, x: -12 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export function ComingSoonBody({
  platformName,
  color,
  type,
  progress,
  features,
}: ComingSoonBodyProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-lg py-10 text-center"
    >
      {/* Progress bar */}
      <div className="mb-8">
        <div className="mb-1.5 flex items-center justify-between text-xs" style={{ color: "var(--text-secondary)" }}>
          <span>Progreso</span>
          <span className="font-mono">{progress}% completado</span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: "rgba(160,120,80,0.15)" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Title */}
      <h2 className="font-heading text-2xl text-foreground mb-1.5">
        {platformName} está en camino
      </h2>
      <p className="text-sm text-muted-foreground mb-8">{type}</p>

      {/* Features list */}
      <div className="text-left">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
          Próximamente podrás ver
        </p>
        <ul className="space-y-2.5">
          {features.map((feature, i) => (
            <motion.li
              key={feature}
              custom={i}
              variants={featureVariants}
              initial="hidden"
              animate="show"
              className="flex items-start gap-2.5 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              <span
                className="mt-0.5 flex-shrink-0 text-base leading-none"
                style={{ color }}
                aria-hidden="true"
              >
                ✦
              </span>
              {feature}
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
