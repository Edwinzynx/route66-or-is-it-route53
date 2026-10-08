"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

export function useResource<T>(path: string) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data?: T;
    error?: string;
  }>();
  const key = `${path}:${revision}`;
  useEffect(() => {
    let active = true;
    api<T>(path)
      .then((data) => {
        if (active) setResult({ key, data });
      })
      .catch((err) => {
        if (active) setResult({ key, error: (err as Error).message });
      });
    return () => {
      active = false;
    };
  }, [path, key]);
  const refresh = useCallback(() => setRevision((current) => current + 1), []);
  return {
    data: result?.key === key ? result.data : undefined,
    error: result?.key === key ? result.error : undefined,
    loading: result?.key !== key,
    refresh,
  };
}

export function useDebounced<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
