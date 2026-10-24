import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { closeConfirm, useConfirm, useToasts } from '../lib/feedback';

export function Toasts() {
  const toasts = useToasts();
  return (
    <div className="toasts" role="status" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className={`toast toast-${t.tone}`}
            initial={{ opacity: 0, y: 24, rotateX: -40 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function ConfirmDialog() {
  const c = useConfirm();
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!c) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeConfirm();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [c]);
  return (
    <AnimatePresence>
      {c && (
        <motion.div
          className="scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeConfirm}
        >
          <motion.div
            className="dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            initial={{ opacity: 0, rotateX: 18, y: 30, scale: 0.94 }}
            animate={{ opacity: 1, rotateX: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, rotateX: -10, y: 10, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="label">אזהרה</span>
            <h2 id="confirm-title">{c.title}</h2>
            {c.body && <p>{c.body}</p>}
            <div className="row">
              <button
                className="btn danger"
                onClick={() => {
                  c.onConfirm();
                  closeConfirm();
                }}
              >
                {c.action}
              </button>
              <button className="btn ghost" ref={cancelRef} onClick={closeConfirm}>
                ביטול
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
