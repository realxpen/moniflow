/**
 * Safe diagnostic category for private, read-only workspace database lookup.
 * Never emit the original Error/message/stack, SQL, connection URL,
 * customer identity or query parameters into a public serverless log.
 */
export type WorkspaceStorageFailureKind =
  | "DATABASE_AUTHENTICATION"
  | "DATABASE_PERMISSION"
  | "DATABASE_SCHEMA"
  | "DATABASE_CONNECTION"
  | "DATABASE_UNAVAILABLE"
  | "UNCLASSIFIED_STORAGE_FAILURE";

export function classifyWorkspaceStorageFailure(error: unknown): WorkspaceStorageFailureKind {
  const candidate = error && typeof error === "object"
    ? error as { code?: unknown; cause?: unknown }
    : null;
  const errorCode = typeof candidate?.code === "string" ? candidate.code : null;
  const cause = candidate?.cause && typeof candidate.cause === "object"
    ? candidate.cause as { code?: unknown }
    : null;
  const code = errorCode ?? (typeof cause?.code === "string" ? cause.code : null);
  switch (code) {
    case "28P01": case "28000":
      return "DATABASE_AUTHENTICATION";
    case "42501":
      return "DATABASE_PERMISSION";
    case "3F000": case "42P01": case "42703":
      return "DATABASE_SCHEMA";
    case "ECONNREFUSED": case "ECONNRESET": case "ENOTFOUND":
    case "EHOSTUNREACH": case "ETIMEDOUT": case "EAI_AGAIN":
      return "DATABASE_CONNECTION";
    case "53300": case "57P01": case "57P02": case "57P03": case "08006": case "08001":
      return "DATABASE_UNAVAILABLE";
    default:
      return "UNCLASSIFIED_STORAGE_FAILURE";
  }
}
