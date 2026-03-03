'use client';

import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(key: string, fetchUrl: string): [T | null, (val: T) => void, boolean] {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setData(JSON.parse(stored));
        setLoading(false);
        return;
      } catch {
        // fall through to fetch
      }
    }
    fetch(fetchUrl)
      .then(res => res.json())
      .then((json: T) => {
        setData(json);
        localStorage.setItem(key, JSON.stringify(json));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [key, fetchUrl]);

  const updateData = useCallback((val: T) => {
    setData(val);
    localStorage.setItem(key, JSON.stringify(val));
  }, [key]);

  return [data, updateData, loading];
}
