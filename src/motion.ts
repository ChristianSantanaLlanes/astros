import { useEffect, useRef, useState, type Ref } from "react";
import type { TargetAndTransition, Transition } from "motion/react";
import { useReducedMotion } from "motion/react";

/** Entrada de UI: vivo, no elástico. */
export const uiSpring = {
  type: "spring",
  stiffness: 420,
  damping: 32,
} as const satisfies Transition;

/** Panel de detalle: ~350ms al asentar. */
export const panelSpring = {
  type: "spring",
  stiffness: 180,
  damping: 22,
} as const satisfies Transition;

/** Salida: 140–180ms ease-out. */
export const exitEase: Transition = {
  duration: 0.16,
  ease: [0.16, 1, 0.3, 1],
};

/** Cambio de vista: fade + 8px Y, ~200ms. */
export const viewEase: Transition = {
  duration: 0.2,
  ease: [0.25, 0.46, 0.45, 0.94],
};

/** Menús estado/prioridad: 120ms. */
export const menuEase: Transition = {
  duration: 0.12,
  ease: [0.25, 0.46, 0.45, 0.94],
};

export const fadeQuick: Transition = {
  duration: 0.12,
  ease: "easeOut",
};

export const STAGGER = 0.035;
export const STAGGER_CAP = 12;
export const MOBILE_MQ = "(max-width: 860px)";

export function useMotionPreference(): boolean {
  return Boolean(useReducedMotion());
}

export function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else ref.current = node;
    }
  };
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

/** True only during the first paint of the ready UI; then stays false without extra renders. */
export function useBootStagger(ready: boolean) {
  const boot = useRef(true);
  useEffect(() => {
    if (!ready) return;
    boot.current = false;
  }, [ready]);
  return boot;
}

export function staggerDelay(index: number, enabled: boolean, reduced: boolean): number {
  if (!enabled || reduced) return 0;
  return Math.min(index, STAGGER_CAP - 1) * STAGGER;
}

export function hidden(
  reduced: boolean,
  from: { x?: number | string; y?: number | string; scale?: number },
): TargetAndTransition {
  if (reduced) return { opacity: 0 };
  return { opacity: 0, ...from };
}

export function bootHidden(
  boot: boolean,
  reduced: boolean,
  from: { x?: number | string; y?: number | string; scale?: number },
): TargetAndTransition | false {
  if (!boot) return false;
  return hidden(reduced, from);
}

export function shown(reduced = false): TargetAndTransition {
  if (reduced) return { opacity: 1 };
  return { opacity: 1, x: 0, y: 0, scale: 1 };
}

export function enterTransition(reduced: boolean, delay = 0): Transition {
  if (reduced) return fadeQuick;
  return delay ? { ...uiSpring, delay } : uiSpring;
}

export function menuPresence(reduced: boolean) {
  return {
    initial: hidden(reduced, { y: 6 }),
    animate: { opacity: 1, y: 0 },
    exit: hidden(reduced, { y: 6 }),
    transition: reduced ? fadeQuick : menuEase,
  };
}
