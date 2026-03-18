// Easing curves
export const EASE_OUT_EXPO = "cubic-bezier(0.16, 1, 0.3, 1)";
export const EASE_IN_OUT = "cubic-bezier(0.4, 0, 0.2, 1)";
export const EASE_SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

// Durations (ms)
export const DURATION_FAST = 150;
export const DURATION_NORMAL = 250;
export const DURATION_SLOW = 400;

// Stagger
export const STAGGER_DELAY = 50;

// Composite helpers
export const transition = {
  fast: `${DURATION_FAST}ms ${EASE_OUT_EXPO}`,
  normal: `${DURATION_NORMAL}ms ${EASE_OUT_EXPO}`,
  slow: `${DURATION_SLOW}ms ${EASE_OUT_EXPO}`,
  spring: `${DURATION_NORMAL}ms ${EASE_SPRING}`,
} as const;
