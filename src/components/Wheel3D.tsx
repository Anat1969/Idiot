import { motion } from 'framer-motion';
import { COLORS } from '../data/starter';
import { useStore } from '../lib/store';

/** ארבעה רבעים מרחפים בפרספקטיבה, מסתובבים לאט. לחיצה מובילה לצבע */
export function Wheel3D() {
  const profiles = useStore((s) => s.library.profiles);
  return (
    <div className="wheel" aria-label="ארבעת הצבעים">
      <motion.div className="wheel-spin" animate={{ rotateZ: [-12, 12, -12] }} transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}>
        {COLORS.map((c, i) => (
          <motion.a
            key={c}
            href={`#/colors/${c}`}
            className={`slab slab-${c}`}
            style={{ rotateZ: i * 90 }}
            initial={{ z: 120, opacity: 0 }}
            animate={{ z: [18, 34, 18], opacity: 1 }}
            transition={{ z: { duration: 6, repeat: Infinity, delay: i * 1.5, ease: 'easeInOut' }, opacity: { duration: 0.8, delay: i * 0.12 } }}
            aria-label={`${profiles[c].name}, ${profiles[c].title}`}
          >
            <span className="slab-text" style={{ rotate: `${-i * 90}deg` }}>
              <b>{profiles[c].name}</b>
              <small>{profiles[c].title}</small>
            </span>
          </motion.a>
        ))}
        <span className="wheel-core" />
      </motion.div>
    </div>
  );
}
