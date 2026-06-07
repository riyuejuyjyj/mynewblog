"use client";

import { motion, type HTMLMotionProps } from "motion/react";

export function Reveal({
  className,
  delay = 0,
  style,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={false}
      whileInView={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      viewport={{ once: true, amount: 0.26, margin: "0px 0px -12% 0px" }}
      transition={{
        duration: 0.72,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{
        backfaceVisibility: "hidden",
        willChange: "transform, opacity",
        ...style,
      }}
      {...props}
    />
  );
}

export function HoverLift({
  className,
  style,
  ...props
}: HTMLMotionProps<"div">) {
  return (
    <motion.div
      className={className}
      whileHover={{
        y: -8,
        scale: 1.018,
      }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 360, damping: 28, mass: 0.7 }}
      style={{
        backfaceVisibility: "hidden",
        willChange: "transform",
        ...style,
      }}
      {...props}
    />
  );
}

export function HoverArticle({
  className,
  style,
  ...props
}: HTMLMotionProps<"article">) {
  return (
    <motion.article
      className={className}
      whileHover={{
        y: -10,
        scale: 1.014,
        rotateZ: -0.35,
      }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 340, damping: 27, mass: 0.75 }}
      style={{
        backfaceVisibility: "hidden",
        willChange: "transform",
        ...style,
      }}
      {...props}
    />
  );
}
