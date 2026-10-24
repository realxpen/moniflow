import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = "apps/mobile/";
const manifest = JSON.parse(readFileSync(root + "public/manifest.webmanifest", "utf8"));
const app = JSON.parse(readFileSync(root + "app.json", "utf8"));
const html = readFileSync(root + "app/+html.tsx", "utf8");
const index = readFileSync(root + "app/index.tsx", "utf8");
const welcome = readFileSync(root + "app/onboarding/welcome.tsx", "utf8");
const webDevice = readFileSync(root + "services/bmoni-device.web.ts", "utf8");
const auth = readFileSync(root + "services/auth-session.ts", "utf8");

describe("MONIFlow iPhone Home Screen app install contract", () => {
  it("exports Expo Router's actual application as a static installable website", () => {
    expect(app.expo.web).toMatchObject({ bundler: "metro", output: "static" });
    expect(html).toContain('href="/manifest.webmanifest"');
    expect(html).toContain('rel="apple-touch-icon"');
    expect(html).toContain('name="apple-mobile-web-app-capable"');
    expect(html).toContain('name="viewport"');
    expect(html).toContain("viewport-fit=cover");
    expect(index).toContain('EXPO_PUBLIC_MONIFLOW_PWA_PREVIEW === "1"');
    expect(index).toContain('"/onboarding/welcome"');
    expect(index).toContain('"/landing"');
  });

  it("provides real valid installed-app PNG icons, not placeholder URLs", () => {
    expect(manifest.display).toBe("standalone");
    expect(manifest.scope).toBe("/");
    expect(manifest.start_url).toBe("/?app=moniflow-sandbox-pwa");
    expect(manifest.name).toMatch(/Sandbox/);
    expect(manifest.description).toMatch(/No real payments/);
    expect(manifest.icons).toHaveLength(2);
    for (const [name, size] of [
      ["apple-touch-icon.png", 180],
      ["icon-192.png", 192],
      ["icon-512.png", 512]
    ] as const) {
      const icon = readFileSync(root + "public/" + name);
      expect([...icon.subarray(0, 8)]).toEqual([137,80,78,71,13,10,26,10]);
      expect(icon.readUInt32BE(16)).toBe(size);
      expect(icon.readUInt32BE(20)).toBe(size);
      expect(icon.length).toBeGreaterThan(1_000);
    }
    for (const icon of manifest.icons) {
      const local = readFileSync(root + "public" + icon.src);
      expect(local.subarray(1, 4).toString()).toBe("PNG");
    }
  });

  it("keeps BMONI signing out of the browser and limits saved credentials to PWA refresh only", () => {
    expect(webDevice).toContain("available: false");
    expect(webDevice).toContain("BMONI device signing requires");
    expect(webDevice).not.toContain("from \"@bkey-inc/");
    expect(auth).toContain("let session: AuthSession | null = null");
    expect(auth).toContain("let refreshToken: string | null = null");
    expect(auth).not.toMatch(/(localStorage|sessionStorage|AsyncStorage)\.(setItem|getItem)/);
    expect(welcome).toContain("MONIFLOW PWA · SIMULATED PAYMENTS ONLY");
    expect(welcome).toContain("Add to Home Screen");
    expect(welcome).toContain("access tokens remain in memory");
    expect(welcome).toContain("cannot run in the browser");
  });
});
