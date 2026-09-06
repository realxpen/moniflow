import { describe, expect, it } from "vitest";

import { summarizeBmoniProviderPayload } from "./errors.js";

describe("summarizeBmoniProviderPayload", () => {
  it("keeps provider structure and candidate ids while redacting personal data", () => {
    const summary = summarizeBmoniProviderPayload({
      statusCode: 409,
      message: "User ada@example.com with +2348012345678 already exists",
      error: "Conflict",
      data: {
        existingUser: {
          bmoniUserId: "bmoni-user-123",
          identityId: "moniflow-abc123",
          email: "ada@example.com",
          phoneNumber: "+2348012345678"
        }
      }
    });

    expect(summary.candidateIdentifiers).toEqual(
      expect.arrayContaining([
        { key: "bmoniUserId", path: "data.existingUser.bmoniUserId", value: "bmoni-user-123" },
        { key: "identityId", path: "data.existingUser.identityId", value: "moniflow-abc123" }
      ])
    );
    expect(summary.fieldPaths).toContain("data.existingUser.email");
    expect(JSON.stringify(summary)).not.toContain("ada@example.com");
    expect(JSON.stringify(summary)).not.toContain("+2348012345678");
    expect(summary.messagePreview[0]).toContain("[redacted-email]");
    expect(summary.messagePreview[0]).toContain("[redacted-number]");
  });

  it("handles absent or undocumented provider payloads safely", () => {
    expect(summarizeBmoniProviderPayload(null)).toEqual({
      candidateIdentifiers: [],
      fieldPaths: [],
      messagePreview: []
    });
  });
});
