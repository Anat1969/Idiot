import { useEffect, useState } from 'react';
import { saveField } from '../lib/library';
import { selectEditing, useStore } from '../lib/store';
import type { Library } from '../lib/types';

type Props<S extends keyof Library> = {
  section: S;
  item: string;
  field: string;
  value: string | string[];
  as?: 'p' | 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'ul' | 'ol';
  className?: string;
};

/** טקסט מהספרייה. במצב עריכה הופך לשדה שנשמר ב-Supabase ביציאה ממנו */
export function Editable<S extends keyof Library>({ section, item, field, value, as = 'p', className = '' }: Props<S>) {
  const editing = useStore(selectEditing);
  const list = Array.isArray(value);
  const text = list ? value.join('\n') : value;
  const [draft, setDraft] = useState(text);
  useEffect(() => setDraft(text), [text]);

  if (editing) {
    return (
      <textarea
        className={`editable ${className}`}
        value={draft}
        rows={list ? Math.max(3, value.length + 1) : Math.max(2, Math.ceil(text.length / 60))}
        aria-label={`עריכה: ${field}`}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft === text) return;
          const next = list ? draft.split('\n').map((s) => s.trim()).filter(Boolean) : draft.trim();
          saveField(section, item, field, next);
        }}
      />
    );
  }

  const Tag = as;
  if (list) {
    const L = as === 'ol' ? 'ol' : 'ul';
    return (
      <L className={className}>
        {value.map((v, i) => (
          <li key={i}>{v}</li>
        ))}
      </L>
    );
  }
  return <Tag className={className}>{value}</Tag>;
}
