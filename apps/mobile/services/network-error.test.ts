import { describe, expect, it } from "vitest";
import { friendlyNetworkError } from "./network-error";

describe("native and web connectivity feedback", () => {
  it("replaces Android DNS exception details with a safe retry message", () => {
    const cause = new Error(
      'fetch failed: java.net.UnknownHostException: Unable to resolve host "moniflow-api-silk.vercel.app": No address associated with hostname'
    );
    const result = friendlyNetworkError(cause);
    expect(result?.message).toContain("Check your internet connection");
    expect(result?.message).not.toContain("java.net");
    expect(result?.message).not.toContain("vercel.app");
    expect(result?.cause).toBe(cause);
  });

  it.each([
    new TypeError("Network request failed"),
    new TypeError("Failed to fetch"),
    new Error("getaddrinfo ENOTFOUND moniflow.invalid"),
    new Error("ERR_NAME_NOT_RESOLVED"),
    new Error("fetch failed")
  ])("handles known connectivity failures without showing native details: %s", cause => {
    const result = friendlyNetworkError(cause);
    expect(result?.message).toBe("Cannot reach MONIFlow API. Check your internet connection, then try again.");
  });

  it("preserves authorization, KYC and read-only policy errors unchanged", () => {
    expect(friendlyNetworkError(new Error("Your MONIFlow session is no longer valid. Sign in again."))).toBeNull();
    expect(friendlyNetworkError(new Error("This MONIFlow Waydroid preview is read-only."))).toBeNull();
    expect(friendlyNetworkError(new Error("Provider registration is disabled."))).toBeNull();
    expect(friendlyNetworkError(new Error("MONIFlow API request timed out."))).toBeNull();
    expect(friendlyNetworkError("fetch failed")).toBeNull();
  });
});
