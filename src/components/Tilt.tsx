import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import type { PropsWithChildren } from 'react';

/** הטיה תלת־ממדית לפי מיקום הסמן, עם הדגשת אור */
export function Tilt({ children, max = 10, className = '' }: PropsWithChildren<{ max?: number; className?: string }>) {
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rx = useSpring(useTransform(y, [0, 1], [max, -max]), { stiffness: 220, damping: 20 });
  const ry = useSpring(useTransform(x, [0, 1], [-max, max]), { stiffness: 220, damping: 20 });
  const glare = useTransform([x, y], ([a, b]: number[]) =>
    `radial-gradient(circle at ${a * 100}% ${b * 100}%, rgba(255,255,255,.28), transparent 55%)`
  );
  return (
    <motion.div
      className={`tilt ${className}`}
      style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width);
        y.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => {
        x.set(0.5);
        y.set(0.5);
      }}
    >
      {children}
      <motion.span className="glare" style={{ background: glare }} aria-hidden="true" />
    </motion.div>
  );
}
