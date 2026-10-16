import { describe, expect, it } from "vitest";
import { classifyWorkspaceStorageFailure } from "./workspace-storage-diagnostics";

describe("workspace storage diagnostic is safe and bounded", () => {
  it.each([
    ["28P01", "DATABASE_AUTHENTICATION"],
    ["28000", "DATABASE_AUTHENTICATION"],
    ["42501", "DATABASE_PERMISSION"],
    ["42P01", "DATABASE_SCHEMA"],
    ["3F000", "DATABASE_SCHEMA"],
    ["ETIMEDOUT", "DATABASE_CONNECTION"],
    ["ECONNREFUSED", "DATABASE_CONNECTION"],
    ["53300", "DATABASE_UNAVAILABLE"],
    ["08006", "DATABASE_UNAVAILABLE"]
  ])("maps %s to an allowlisted category", (code, result) => {
    expect(classifyWorkspaceStorageFailure({ code })).toBe(result);
  });

  it("never copies SQL, API tokens, user IDs, connection strings or raw errors", () => {
    const marker = "SHOULD_NOT_APPEAR_IN_LOG";
    const error = {
      code: "42P01", message: marker, detail: marker,
      query: marker, connectionString: marker,
      userId: marker
    };
    expect(classifyWorkspaceStorageFailure(error)).toBe("DATABASE_SCHEMA");
    expect(classifyWorkspaceStorageFailure(error)).not.toContain(marker);
    expect(classifyWorkspaceStorageFailure({ code: "unknown", message: marker })).toBe("UNCLASSIFIED_STORAGE_FAILURE");
    expect(classifyWorkspaceStorageFailure(new Error(marker))).toBe("UNCLASSIFIED_STORAGE_FAILURE");
    expect(classifyWorkspaceStorageFailure(null)).toBe("UNCLASSIFIED_STORAGE_FAILURE");
    expect(classifyWorkspaceStorageFailure({ cause: { code: "42501" }, message: marker })).toBe("DATABASE_PERMISSION");
  });
});
