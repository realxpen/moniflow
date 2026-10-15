import { createHash } from "node:crypto";

// The fingerprint, not the actual shared key, is committed.
// Key must be fetched over HTTPS from the official PUBLIC sandbox documentation.
export const BMONI_PUBLIC_DOCS_URL = "https://embedded-docs.bmoni.com/api-reference/introduction/";
const PINNED_SHARED_SANDBOX_KEY_SHA256 =
  "52d83a85e228624f4eff2f9c868932122b98db04e61a9f692381566033ae664b";

export function extractVerifiedPublicSandboxKey(page: string): string {
  const found = [...new Set(page.match(/pk_[0-9a-f]{12}_[0-9a-f]{48}/gi) ?? [])];
  const valid = found.filter(key =>
    createHash("sha256").update(key).digest("hex") === PINNED_SHARED_SANDBOX_KEY_SHA256
  );
  if (valid.length !== 1) throw new Error("PUBLIC_SANDBOX_KEY_MISSING_OR_CHANGED");
  return valid[0]!;
}

export async function loadPublicSandboxKey(
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetchImpl(BMONI_PUBLIC_DOCS_URL, {
      method: "GET", redirect: "error",
      headers: { accept: "text/html" },
      signal: controller.signal
    });
    if (!response.ok) throw new Error("PUBLIC_SANDBOX_DOCUMENTATION_UNAVAILABLE");
    const html = await response.text();
    if (html.length > 2_000_000) throw new Error("PUBLIC_SANDBOX_DOCUMENTATION_TOO_LARGE");
    return extractVerifiedPublicSandboxKey(html);
  } finally {
    clearTimeout(timeout);
  }
}
