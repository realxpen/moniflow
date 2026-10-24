import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  isAllowedBrowserPwaSandboxMutation,
  isAllowedWaydroidSandboxMutation,
  waydroidSandboxHostname
} from "./waydroid-sandbox-write-policy";

const api = "https://" + waydroidSandboxHostname;
const base: {
  waydroidPreview: boolean;
  dedicatedSandboxPreview: boolean;
  configuredApiUrl: string;
  method: string;
} = {
  waydroidPreview: true, dedicatedSandboxPreview: true,
  configuredApiUrl: api, method: "POST"
};
const allowed = (path: string, overrides: Partial<typeof base> = {}) =>
  isAllowedWaydroidSandboxMutation({ ...base, ...overrides, requestUrl: api + path });

describe("separate x86 Waydroid sandbox writes", () => {
  it.each([
    "/api/sandbox-demo/bootstrap",
    "/api/sandbox-demo/preview",
    "/api/sandbox-demo/plan",
    "/api/sandbox-demo/reset",
    "/api/sandbox-demo/plans/11111111-1111-4111-8111-111111111111/approve",
    "/api/sandbox-demo/plans/11111111-1111-4111-8111-111111111111/simulate"
  ])("permits only authenticated simulation POST %s", path => {
    expect(allowed(path)).toBe(true);
    expect(allowed(path, { dedicatedSandboxPreview: false })).toBe(false);
    expect(allowed(path, { waydroidPreview: false })).toBe(false);
    expect(allowed(path, { method: "PUT" })).toBe(false);
    expect(allowed(path, { method: "DELETE" })).toBe(false);
  });

  it.each([
    "/api/wallet/init",
    "/api/operator/plans",
    "/api/onboarding/nigeria/start",
    "/api/onboarding/nigeria/documents",
    "/api/banks/beneficiary",
    "/api/pockets",
    "/api/partner",
    "/api/sandbox-demo/unknown",
    "/api/sandbox-demo/plans/not-a-uuid/simulate",
    "/api/sandbox-demo/bootstrap?duplicate=1",
    "/api/sandbox-demo/reset#fragment",
    "/api/sandbox-demo/plans/11111111-1111-4111-8111-111111111111/approve?token=1"
  ])("rejects all unapproved mutation paths: %s", path => {
    expect(allowed(path)).toBe(false);
  });

  it("requires one reviewed HTTPS host, no embedded credentials and no redirect destination", () => {
    const path = "/api/sandbox-demo/bootstrap";
    expect(allowed(path, { configuredApiUrl: "https://attacker.example" })).toBe(false);
    expect(allowed(path, { configuredApiUrl: "http://" + waydroidSandboxHostname })).toBe(false);
    expect(allowed(path, { configuredApiUrl: api + "/unexpected" })).toBe(false);
    expect(allowed(path, { configuredApiUrl: api + "?params=1" })).toBe(false);
    expect(isAllowedWaydroidSandboxMutation({ ...base, requestUrl: "https://evil.example" + path })).toBe(false);
    expect(isAllowedWaydroidSandboxMutation({ ...base, requestUrl: "http://" + waydroidSandboxHostname + path })).toBe(false);
    expect(isAllowedWaydroidSandboxMutation({ ...base, requestUrl: "https://user:pass@" + waydroidSandboxHostname + path })).toBe(false);
  });

  it("preserves separate signer-free APK identity and the legacy read-only profile", () => {
    const c = readFileSync("apps/mobile/app.config.js", "utf8");
    const eas = JSON.parse(readFileSync("apps/mobile/eas.json", "utf8"));
    const client = readFileSync("apps/mobile/services/api-fetch.ts", "utf8");
    const sandboxProfile = eas.build["waydroid-sandbox-x86-apk"];
    expect(sandboxProfile.extends).toBe("waydroid-x86-apk");
    expect(sandboxProfile.env.EXPO_PUBLIC_MONIFLOW_WAYDROID_PREVIEW).toBe("1");
    expect(sandboxProfile.env.EXPO_PUBLIC_MONIFLOW_SANDBOX_PREVIEW).toBe("1");
    expect(sandboxProfile.env.EXPO_PUBLIC_API_URL).toBe(api);
    expect(eas.build["waydroid-x86-apk"].env?.EXPO_PUBLIC_MONIFLOW_SANDBOX_PREVIEW).toBeUndefined();
    expect(c).toContain("com.realxpen.moniflow.sandbox");
    expect(c).toContain("com.realxpen.moniflow.waydroid");
    expect(c).toContain("@bkey-inc/bmoni_embedded_sdk");
    expect(c).toContain("nativeWalletFeaturesEnabled: false");
    expect(c).toContain("must use the signer-free x86 Waydroid profile");
    expect(client).toContain("isAllowedWaydroidSandboxMutation");
    expect(client).toContain("Waydroid financial operations are disabled");
  });
});

describe("iPhone PWA sandbox-only network boundary", () => {
  const check = (path: string, method = "POST", configuredApiUrl = api) =>
    isAllowedBrowserPwaSandboxMutation({
      configuredApiUrl,
      requestUrl: api + path,
      method
    });
  it("permits only user-authenticated server-sandbox command routes", () => {
    expect(check("/api/sandbox-demo/bootstrap")).toBe(true);
    expect(check("/api/sandbox-demo/preview")).toBe(true);
    expect(check("/api/sandbox-demo/plan")).toBe(true);
    expect(check("/api/sandbox-demo/reset")).toBe(true);
    expect(check("/api/sandbox-demo/plans/11111111-1111-4111-8111-111111111111/approve")).toBe(true);
    expect(check("/api/sandbox-demo/plans/11111111-1111-4111-8111-111111111111/simulate")).toBe(true);
  });
  it.each([
    "/api/operator/plans",
    "/api/onboarding/nigeria/start",
    "/api/banks/beneficiary",
    "/api/dev/reset",
    "/internal/v1/collections",
    "/api/wallet/init",
    "/api/sandbox-demo/plan?destination=other"
  ])("blocks all other mutation namespaces: %s", path => {
    expect(check(path)).toBe(false);
  });
  it("rejects wrong methods, origins, schemes and injected query strings", () => {
    expect(check("/api/sandbox-demo/bootstrap", "PATCH")).toBe(false);
    expect(check("/api/sandbox-demo/bootstrap", "DELETE")).toBe(false);
    expect(check("/api/sandbox-demo/bootstrap", "POST", "https://different.vercel.app")).toBe(false);
    expect(check("/api/sandbox-demo/bootstrap", "POST", "http://" + waydroidSandboxHostname)).toBe(false);
  });
  it("enforces PWA preview opt-in only on web platform", () => {
    const client = readFileSync("apps/mobile/services/api-fetch.ts", "utf8");
    expect(client).toContain('Platform.OS === "web"');
    expect(client).toContain('EXPO_PUBLIC_MONIFLOW_PWA_PREVIEW === "1"');
    expect(client).toContain('isAllowedBrowserPwaSandboxMutation');
    expect(client).toContain('MONIFlow PWA is simulation-only');
  });
});
