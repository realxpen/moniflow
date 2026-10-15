/**
 * Local operator-only BMONI sandbox lab. Never deploy as an HTTP route.
 *
 * Usage from repo root:
 * pnpm --filter @moniflow/api lab:bmoni health
 */
import { BmoniClient } from "../src/services/bmoni/client.js";
import { getBmoniConfig } from "../src/services/bmoni/config.js";
import { assertSharedKeyLabAllowed, runSharedKeyLab } from "../src/services/bmoni/shared-key-lab.js";

const command = process.argv[2];
if (process.argv.length !== 3) {
  process.stderr.write("Choose exactly one documented lab action; no API keys or private data in CLI arguments.\n");
  process.exit(2);
}
try {
  // Run all local/write/security gates before reading credentials or making a request.
  const action = assertSharedKeyLabAllowed(command, process.env);
  const config = getBmoniConfig(); // Enforces HTTPS embedded-dev.bmoni.com only.
  const client = new BmoniClient(config);
  const result = await runSharedKeyLab(action, client, process.env);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  if (result.results.some(step => step.ok === false)) process.exitCode = 1;
} catch (error) {
  // Do not print untrusted provider bodies, environment values, keys, signatures,
  // identity details or messages that could contain personal information.
  const code = error instanceof Error && (
    error.message.startsWith("LAB_") || error.message.startsWith("BMONI sandbox configuration")
  ) ? error.message : "BMONI_LAB_OPERATION_FAILED: No retry was attempted. Inspect provider audit evidence manually.";
  process.stderr.write(code + "\n");
  process.exitCode = 1;
}
