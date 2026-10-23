/**
 * Separate Waydroid sandbox APK only. This deliberately does NOT relax
 * the existing Waydroid UI/read-only APK or any real-finance route.
 *
 * Keep a fixed staging hostname in source: an attacker-controlled API URL,
 * redirect, query, or arbitrary bank/wallet path can never enable mutation.
 * A future sandbox deployment host change needs code review and a new APK.
 */
export const waydroidSandboxHostname =
  "moniflow-sandbox-staging-git-rc-moni-312569-swifnatechnologyltd.vercel.app";

const sandboxMutationPaths = new Set([
  "/api/sandbox-demo/bootstrap",
  "/api/sandbox-demo/plan",
  "/api/sandbox-demo/reset"
]);
const sandboxPlanMutationPath =
  /^\/api\/sandbox-demo\/plans\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/(?:approve|simulate)$/i;

export function isAllowedWaydroidSandboxMutation(args: {
  waydroidPreview: boolean;
  dedicatedSandboxPreview: boolean;
  configuredApiUrl: string | undefined;
  requestUrl: string;
  method: string;
}) {
  if (!args.waydroidPreview || !args.dedicatedSandboxPreview ||
      args.method.toUpperCase() !== "POST" || !args.configuredApiUrl) {
    return false;
  }
  try {
    const configured = new URL(args.configuredApiUrl);
    const target = new URL(args.requestUrl);
    const targetPath = target.pathname;
    return configured.protocol === "https:" &&
      configured.hostname === waydroidSandboxHostname &&
      configured.username === "" && configured.password === "" &&
      configured.pathname.replace(/\/$/, "") === "" &&
      configured.search === "" && configured.hash === "" &&
      target.origin === configured.origin &&
      target.username === "" && target.password === "" &&
      target.search === "" && target.hash === "" &&
      (sandboxMutationPaths.has(targetPath) ||
        sandboxPlanMutationPath.test(targetPath));
  } catch {
    return false;
  }
}
