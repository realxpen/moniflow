import { probeBmoniCloud } from "./bmoni-cloud-readonly-probe.mjs";

const findings = await probeBmoniCloud();
for (const item of findings) {
  process.stdout.write((item.pass ? "PASS" : "BLOCKED") + ": " + item.check + " — " + item.detail + "\n");
}
if (findings.some(item => !item.pass) || findings.length !== 3) {
  process.stderr.write("BMONI shared-key live connection is not verified. No account or payment was changed.\n");
  process.exitCode = 1;
} else {
  process.stdout.write("Verified: deployed MONIFlow API reached BMONI sandbox through the configured server key. Public user creation remains disabled.\n");
}
