import { useCallback, useEffect, useState } from "react";

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiResult<T> extends UseApiState<T> {
  execute: () => Promise<T | null>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
  clearError: () => void;
}

export function useApi<T>(
  requestFn: () => Promise<T>,
  options: { immediate?: boolean } = {}
): UseApiResult<T> {
  const { immediate = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await requestFn();
      setData(result);
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unexpected request failure.";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [requestFn]);

  useEffect(() => {
    if (immediate) {
      void execute();
    }
  }, [execute, immediate]);

  return {
    data,
    loading,
    error,
    execute,
    setData,
    clearError: () => setError(null)
  };
}
