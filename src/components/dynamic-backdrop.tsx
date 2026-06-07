"use client";

import { AnimatePresence, motion } from "motion/react";
import { type CSSProperties, useEffect, useMemo, useState } from "react";

import { profile } from "@/content/seed";

type DynamicBackdropProps = {
  ambientMode: "day" | "night";
};

export function DynamicBackdrop({ ambientMode }: DynamicBackdropProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const fireflies = useMemo(
    () =>
      Array.from({ length: 30 }, (_, index) => ({
        id: index,
        left: `${(index * 31 + 7) % 100}%`,
        top: `${(index * 47 + 13) % 100}%`,
        size: 3 + (index % 4),
        delay: (index % 9) * 0.35,
        duration: 4.8 + (index % 7) * 0.55,
      })),
    [],
  );
  const grass = useMemo(
    () =>
      Array.from({ length: 20 }, (_, index) => ({
        id: index,
        left: `${(index * 17) % 100}%`,
        height: `${42 + (index % 5) * 12}px`,
        delay: `${(index % 6) * 0.25}s`,
      })),
    [],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % profile.backgroundImages.length);
    }, 9000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="dynamic-backdrop" data-ambient={ambientMode} aria-hidden="true">
      <AnimatePresence mode="wait">
        <motion.div
          key={profile.backgroundImages[activeIndex]}
          className="backdrop-slide"
          style={
            {
              "--backdrop-image": `url(${profile.backgroundImages[activeIndex]})`,
            } as CSSProperties
          }
          initial={false}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 1.8, ease: "easeInOut" }}
        />
      </AnimatePresence>
      <motion.div
        className="backdrop-wash"
        animate={{
          x: ambientMode === "day" ? ["0%", "-1.2%", "0.8%"] : ["0%", "1%", "-1%"],
          y: ["0%", "-0.8%", "0.4%"],
        }}
        transition={{ duration: 18, repeat: Infinity, repeatType: "mirror" }}
      />
      <div className="backdrop-grid" />
      <div className="firefly-field">
        {fireflies.map((firefly) => (
          <motion.span
            key={firefly.id}
            style={{
              left: firefly.left,
              top: firefly.top,
              width: firefly.size,
              height: firefly.size,
            }}
            initial={{ opacity: 0.1, x: 0, y: 0, scale: 0.8 }}
            animate={{
              opacity: ambientMode === "night" ? [0.2, 1, 0.35] : [0.08, 0.35, 0.12],
              x: [0, 22 - (firefly.id % 5) * 8, -12],
              y: [0, -34 + (firefly.id % 4) * 7, 10],
              scale: [0.8, 1.45, 0.9],
            }}
            transition={{
              duration: firefly.duration,
              delay: firefly.delay,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      <div className="wind-grass">
        {grass.map((blade) => (
          <span
            key={blade.id}
            style={{
              left: blade.left,
              height: blade.height,
              animationDelay: blade.delay,
            }}
          />
        ))}
      </div>
    </div>
  );
}
