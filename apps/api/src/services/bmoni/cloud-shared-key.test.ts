import { describe, expect, it, vi } from "vitest";

import {
  BMONI_PUBLIC_DOCS_URL, extractVerifiedPublicSandboxKey, loadPublicSandboxKey
} from "./cloud-shared-key.js";

describe("publicly documented BMONI sandbox-key discovery", () => {
  it("requires the reviewed fingerprint, not merely a plausible-looking key", () => {
    const forged = "pk_" + "a".repeat(12) + "_" + "b".repeat(48);
    expect(() => extractVerifiedPublicSandboxKey("<html>" + forged + "</html>"))
      .toThrow("PUBLIC_SANDBOX_KEY_MISSING_OR_CHANGED");
  });

  it("never accepts documents with no published key", () => {
    expect(() => extractVerifiedPublicSandboxKey("<html>no key</html>"))
      .toThrow("PUBLIC_SANDBOX_KEY_MISSING_OR_CHANGED");
  });

  it("fetches only the official HTTPS source with no redirects, auth or request body", async () => {
    const remote = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("<html>missing</html>", { status: 200 })
    );
    await expect(loadPublicSandboxKey(remote)).rejects.toThrow("PUBLIC_SANDBOX_KEY_MISSING_OR_CHANGED");
    expect(remote).toHaveBeenCalledOnce();
    expect(remote.mock.calls[0]?.[0]).toBe(BMONI_PUBLIC_DOCS_URL);
    const opts = remote.mock.calls[0]?.[1];
    expect(opts?.method).toBe("GET");
    expect(opts?.redirect).toBe("error");
    expect(opts?.body).toBeUndefined();
    expect(opts?.headers).toEqual({ accept: "text/html" });
  });

  it("fails safely when BMONI documentation is missing or changed", async () => {
    const remote = vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 503 }));
    await expect(loadPublicSandboxKey(remote)).rejects.toThrow("PUBLIC_SANDBOX_DOCUMENTATION_UNAVAILABLE");
    expect(remote).toHaveBeenCalledOnce();
  });

  it("rejects oversized remote content without exposing it", async () => {
    const remote = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("x".repeat(2_000_001), { status: 200 })
    );
    await expect(loadPublicSandboxKey(remote)).rejects.toThrow("PUBLIC_SANDBOX_DOCUMENTATION_TOO_LARGE");
  });
});
