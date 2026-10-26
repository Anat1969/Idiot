import { useMemo } from 'react';
import { useStore } from './store';
import type { Role } from './types';

/** כל התפקידים: המובנים מהספרייה ואלה שמשתמשים הוסיפו */
export function useAllRoles(): Role[] {
  const builtIn = useStore((s) => s.library.roles);
  const custom = useStore((s) => s.customRoles);
  return useMemo(() => [...Object.values(builtIn), ...custom], [builtIn, custom]);
}
