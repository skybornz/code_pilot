import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delay = 1000,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < retries - 1) {
        if (onRetry) onRetry(i + 1, error as Error);
        // simple increasing backoff
        await new Promise((res) => setTimeout(res, delay * (i + 1)));
      }
    }
  }
  throw lastError;
}
