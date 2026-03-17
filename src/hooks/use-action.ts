"use client";

import { useState } from "react";
import { toast } from "sonner";

interface UseActionOptions {
  onSuccess?: (data: unknown) => void;
  successMessage?: string;
}

export function useAction(options?: UseActionOptions) {
  const [loading, setLoading] = useState(false);

  const execute = async (url: string, fetchOptions: RequestInit) => {
    try {
      setLoading(true);
      const res = await fetch(url, {
        ...fetchOptions,
        headers: {
          "Content-Type": "application/json",
          ...fetchOptions.headers,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      if (options?.successMessage) {
        toast.success(options.successMessage);
      }
      options?.onSuccess?.(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { execute, loading };
}
