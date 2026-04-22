"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

// ── Stagger children in on mount ──
export function useStaggerIn(selector = "> *", delay = 0) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const children = ref.current.querySelectorAll(selector);
    if (children.length === 0) return;

    gsap.fromTo(
      children,
      { opacity: 0, y: 12 },
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        stagger: 0.05,
        delay,
        ease: "power3.out",
      }
    );
  }, [selector, delay]);

  return ref;
}

// ── Fade in on mount ──
export function useFadeIn(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.5, delay, ease: "power3.out" }
    );
  }, [delay]);

  return ref;
}

// ── Count up animation for numbers ──
export function useCountUp(endValue: number, duration = 1) {
  const ref = useRef<HTMLSpanElement>(null);
  const prevValue = useRef(0);

  useEffect(() => {
    if (!ref.current) return;
    const obj = { value: prevValue.current };

    gsap.to(obj, {
      value: endValue,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        if (ref.current) {
          ref.current.textContent = Math.round(obj.value).toLocaleString();
        }
      },
    });

    prevValue.current = endValue;
  }, [endValue, duration]);

  return ref;
}

// ── Scale in (for modals, dropdowns) ──
export function useScaleIn() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { opacity: 0, scale: 0.95, y: -4 },
      { opacity: 1, scale: 1, y: 0, duration: 0.2, ease: "power2.out" }
    );
  }, []);

  return ref;
}

// ── Slide in from left (for sidebars, panels) ──
export function useSlideIn(direction: "left" | "right" | "up" | "down" = "left") {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const axis = direction === "left" || direction === "right" ? "x" : "y";
    const value = direction === "left" || direction === "up" ? -20 : 20;

    gsap.fromTo(
      ref.current,
      { opacity: 0, [axis]: value },
      { opacity: 1, [axis]: 0, duration: 0.4, ease: "power3.out" }
    );
  }, [direction]);

  return ref;
}

// ── Hover scale effect ──
export function useHoverScale(scale = 1.02) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    const onEnter = () => gsap.to(el, { scale, duration: 0.2, ease: "power2.out" });
    const onLeave = () => gsap.to(el, { scale: 1, duration: 0.2, ease: "power2.out" });

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);

    return () => {
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [scale]);

  return ref;
}
