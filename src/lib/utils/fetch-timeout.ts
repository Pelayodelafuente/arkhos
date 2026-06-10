// fetch con timeout por defecto para llamadas a APIs externas.
// Una API externa colgada nunca debe bloquear un Server Component
// más allá del timeout (Vercel cortaría a los 10-60s con un 504 opaco).

type FetchInit = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] };
};

export const DEFAULT_FETCH_TIMEOUT_MS = 8000;

export function fetchWithTimeout(
  url: string | URL,
  init: FetchInit = {},
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS
): Promise<Response> {
  return fetch(url, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(timeoutMs),
  });
}
