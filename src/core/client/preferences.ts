import { useState } from 'react';
export function usePreference(key: string, fallback: string) {
  const [value, setValue] = useState(() => {
    try {
      return localStorage.getItem('tk:' + key) ?? fallback;
    } catch {
      return fallback;
    }
  });
  function save(next: string) {
    setValue(next);
    try {
      localStorage.setItem('tk:' + key, next);
    } catch {
      /* Private browsing can disable storage. */
    }
  }
  return [value, save] as const;
}
