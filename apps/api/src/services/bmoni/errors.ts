import type { BmoniErrorEnvelope } from "./schemas.js";

export class BmoniConfigurationError extends Error {
  override readonly name = "BmoniConfigurationError";
}

export class BmoniTransportError extends Error {
  override readonly name = "BmoniTransportError";

  constructor(
    message: string,
    readonly timedOut: boolean,
    options?: ErrorOptions
  ) {
    super(message, options);
  }
}

export class BmoniProviderError extends Error {
  override readonly name = "BmoniProviderError";

  constructor(
    readonly statusCode: number,
    readonly providerError: BmoniErrorEnvelope | null,
    readonly requestId: string | null,
    readonly providerPayload: unknown = providerError
  ) {
    super(`BMONI request failed with HTTP ${statusCode}.`);
  }
}

export class BmoniResponseValidationError extends Error {
  override readonly name = "BmoniResponseValidationError";

  constructor(readonly requestId: string | null, options?: ErrorOptions) {
    super("BMONI returned a response that does not match the documented contract.", options);
  }
}

export type BmoniProviderDiagnostic = {
  candidateIdentifiers: Array<{ key: string; path: string; value: string }>;
  fieldPaths: string[];
  messagePreview: string[];
};

const SENSITIVE_KEY_PATTERN =
  /(api.?key|authorization|token|secret|password|signature|bvn|nin|email|phone|address|account.?number|document.?number)/i;
const CANDIDATE_IDENTIFIER_PATTERN =
  /^(?:id|userId|user_id|bmoniUserId|bmoni_user_id|existingUserId|existing_user_id|identityId|identity_id|employeeId|employee_id)$/i;
const MAX_DEPTH = 5;
const MAX_FIELDS = 80;
const MAX_CANDIDATES = 20;

export function summarizeBmoniProviderPayload(payload: unknown): BmoniProviderDiagnostic {
  const fieldPaths: string[] = [];
  const candidateIdentifiers: BmoniProviderDiagnostic["candidateIdentifiers"] = [];
  const messages: string[] = [];

  const addMessage = (value: unknown) => {
    if (typeof value === "string" && value.trim()) {
      messages.push(redactDiagnosticText(value));
    } else if (Array.isArray(value)) {
      for (const item of value) addMessage(item);
    }
  };

  const walk = (value: unknown, path: string, depth: number) => {
    if (depth > MAX_DEPTH || fieldPaths.length >= MAX_FIELDS) return;

    if (Array.isArray(value)) {
      for (let index = 0; index < Math.min(value.length, 10); index += 1) {
        walk(value[index], `${path}[${index}]`, depth + 1);
      }
      return;
    }

    if (!isRecord(value)) return;

    for (const [key, nested] of Object.entries(value)) {
      if (fieldPaths.length >= MAX_FIELDS) break;
      const childPath = path ? `${path}.${key}` : key;
      fieldPaths.push(childPath);

      if (/^message$/i.test(key)) addMessage(nested);

      if (
        candidateIdentifiers.length < MAX_CANDIDATES &&
        CANDIDATE_IDENTIFIER_PATTERN.test(key) &&
        !SENSITIVE_KEY_PATTERN.test(key) &&
        (typeof nested === "string" || typeof nested === "number")
      ) {
        const candidate = String(nested).trim();
        if (candidate && !looksLikeSensitiveValue(candidate)) {
          candidateIdentifiers.push({ key, path: childPath, value: candidate });
        }
      }

      if (!SENSITIVE_KEY_PATTERN.test(key)) {
        walk(nested, childPath, depth + 1);
      }
    }
  };

  walk(payload, "", 0);

  return {
    candidateIdentifiers,
    fieldPaths,
    messagePreview: messages.slice(0, 10)
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function looksLikeSensitiveValue(value: string): boolean {
  if (/@/.test(value)) return true;
  if (/^\+?\d[\d\s()-]{7,}\d$/.test(value)) return true;
  if (/^\d{11}$/.test(value)) return true;
  return false;
}

function redactDiagnosticText(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\+?\d[\d\s()-]{7,}\d/g, "[redacted-number]")
    .replace(/\b(?:sk|pk|token|key)[-_]?[A-Za-z0-9_-]{12,}\b/gi, "[redacted-secret]")
    .slice(0, 500);
}
