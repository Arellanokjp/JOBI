import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from './api';

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
  setData: (value: T | null) => void;
}

/** Runs `fn` on mount and whenever `deps` change; ignores results from outdated runs. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const latest = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    const run = ++latest.current;
    setLoading(true);
    fnRef.current()
      .then((result) => {
        if (run !== latest.current) return;
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (run !== latest.current) return;
        setError(errorMessage(err));
      })
      .finally(() => {
        if (run === latest.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((value) => value + 1), []);
  return { data, error, loading, reload, setData };
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong. Please try again.';
}

/** Minimal controlled-form helper: `const f = useForm({ name: '' }); <input {...f.bind('name')} />` */
export function useForm<T extends Record<string, string | boolean>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const set = <K extends keyof T>(key: K, value: T[K]) => setValues((prev) => ({ ...prev, [key]: value }));
  const bind = <K extends keyof T>(key: K) => ({
    value: values[key] as string,
    onChange: (event: { target: { value: string } }) => set(key, event.target.value as T[K]),
  });
  const check = <K extends keyof T>(key: K) => ({
    checked: values[key] as boolean,
    onChange: (event: { target: { checked: boolean } }) => set(key, event.target.checked as T[K]),
  });
  return { values, set, bind, check, reset: () => setValues(initial), setValues };
}

/** Wraps an async action with a busy flag and toast-friendly error handling. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    setError(null);
    try {
      return await action();
    } catch (err) {
      setError(errorMessage(err));
      return undefined;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, run };
}
