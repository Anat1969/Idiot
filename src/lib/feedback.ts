import { useSyncExternalStore } from 'react';

type Toast = { id: number; text: string; tone: 'ok' | 'error' };
type Confirm = { title: string; body?: string; action: string; onConfirm: () => void };

let toasts: Toast[] = [];
let confirmState: Confirm | null = null;
const ls = new Set<() => void>();
const emit = () => ls.forEach((l) => l());
const sub = (l: () => void) => (ls.add(l), () => ls.delete(l));

export function toast(text: string, tone: Toast['tone'] = 'ok') {
  const t = { id: Date.now() + Math.random(), text, tone };
  toasts = [...toasts, t];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id);
    emit();
  }, 3200);
}

/** אזהרה לפני פעולה בלתי הפיכה */
export function confirmAction(c: Confirm) {
  confirmState = c;
  emit();
}
export function closeConfirm() {
  confirmState = null;
  emit();
}

export const useToasts = () => useSyncExternalStore(sub, () => toasts);
export const useConfirm = () => useSyncExternalStore(sub, () => confirmState);
