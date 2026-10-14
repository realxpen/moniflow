import { probePhase20 } from "./phase20-release-probe.mjs";

const checks = await probePhase20();
for (const check of checks) {
  process.stdout.write((check.ok ? "PASS" : "FAIL") + " — " + check.name +
    (check.ok ? "" : ": " + check.detail) + "\n");
}
const successful = checks.length === 7 && checks.every(check => check.ok);
process.stdout.write(successful
  ? "Public release gate passed. Authenticated and cross-user checks remain mandatory.\n"
  : "Public release gate failed. Do not call the authenticated demo production-ready.\n");
if (!successful) process.exitCode = 1;
