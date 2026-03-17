"use client";

import { useState } from "react";
import { toast } from "sonner";

interface UseActionOptions {
  onSuccess?: (data: unknown) => void;
  onError?: (error: string, errors?: string[]) => void;
  successMessage?: string;
}

export function useAction(options?: UseActionOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const clearErrors = () => {
    setError(null);
    setErrors([]);
  };

  const execute = async (url: string, fetchOptions: RequestInit) => {
    try {
      setLoading(true);
      clearErrors();
      const res = await fetch(url, {
        ...fetchOptions,
        headers: {
          "Content-Type": "application/json",
          ...fetchOptions.headers,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = typeof data.error === "string"
          ? data.error
          : "Something went wrong";
        const errList: string[] = Array.isArray(data.errors) ? data.errors : [];

        setError(msg);
        setErrors(errList);
        toast.error(msg);
        options?.onError?.(msg, errList);
        return null;
      }

      if (options?.successMessage) {
        toast.success(options.successMessage);
      }

      // Show warnings from policy validation if present
      if (data._validation?.warnings) {
        for (const w of data._validation.warnings) {
          toast.warning(w);
        }
      }

      options?.onSuccess?.(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { execute, loading, error, errors, clearErrors };
}
