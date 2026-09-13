const defaultTimeoutMs = 12_000;

export async function apiFetch(url: string, init?: RequestInit, timeoutMs = defaultTimeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (cause) {
    if (controller.signal.aborted) {
      throw new Error("MONIFlow API request timed out. Check the connection and try again.");
    }
    throw cause;
  } finally {
    clearTimeout(timer);
  }
}
