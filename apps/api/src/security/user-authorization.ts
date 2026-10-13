import { createPublicKey, createVerify } from "node:crypto";

import type { FastifyInstance, FastifyRequest } from "fastify";

type AuthSettings = {
  issuer?: string;
  jwksUrl?: string;
  audience: string;
};

export type VerifiedUser = { userId: string };

export type VerifyToken = (token: string) => Promise<VerifiedUser>;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const publicPaths = new Set(["/health", "/health/provider", "/health/bmoni"]);
// The verified identity is request-scoped and can never be supplied by a client.
// Multipart form fields are parsed in their handlers, after the general auth hook.
const authenticatedUsers = new WeakMap<FastifyRequest, string>();

export function getAuthenticatedUserId(request: FastifyRequest): string | null {
  return authenticatedUsers.get(request) ?? null;
}
type JwtHeader = { alg?: string; kid?: string; typ?: string };
type JwtClaims = { sub?: string; iss?: string; aud?: string | string[]; exp?: number; nbf?: number; iat?: number; role?: string };
type Jwk = { kty: string; kid: string; alg?: string; use?: string; [key: string]: unknown };

function decodeSegment<T>(value: string): T {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length > 12000) throw new Error("Invalid token encoding");
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) && !Buffer.isBuffer(value);
}

/** Never use the unverified JWT to discover keys or build a JWKS URL. */
export function createSupabaseJwtVerifier(settings: AuthSettings): VerifyToken {
  const { issuer, jwksUrl, audience } = settings;
  if (!issuer || !jwksUrl) throw new Error("AUTH_CONFIGURATION_REQUIRED");
  const authority = new URL(issuer);
  const keyUrl = new URL(jwksUrl);
  if (authority.protocol !== "https:" || keyUrl.protocol !== "https:" || authority.origin !== keyUrl.origin) {
    throw new Error("AUTH_CONFIGURATION_INVALID");
  }
  if (!keyUrl.pathname.startsWith(authority.pathname.replace(/\/$/, "") + "/")) {
    throw new Error("AUTH_CONFIGURATION_INVALID");
  }
  let keys: Jwk[] = [];
  let cacheUntil = 0;

  const loadKeys = async (force = false): Promise<Jwk[]> => {
    if (!force && Date.now() < cacheUntil) return keys;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(keyUrl.href, {
        method: "GET",
        redirect: "error",
        headers: { accept: "application/json" },
        signal: controller.signal
      });
      if (!response.ok) throw new Error("JWKS_UNAVAILABLE");
      const payload = await response.json() as { keys?: unknown };
      if (!Array.isArray(payload.keys) || payload.keys.length > 32) throw new Error("JWKS_INVALID");
      keys = payload.keys.filter((value): value is Jwk =>
        isRecord(value) && typeof value.kid === "string" &&
        (value.kty === "EC" || value.kty === "RSA")) as Jwk[];
      if (!keys.length) throw new Error("JWKS_INVALID");
      cacheUntil = Date.now() + 300_000;
      return keys;
    } finally {
      clearTimeout(timeout);
    }
  };

  return async (token: string): Promise<VerifiedUser> => {
    if (token.length > 16_384) throw new Error("INVALID_TOKEN");
    const segments = token.split(".");
    if (segments.length !== 3) throw new Error("INVALID_TOKEN");
    const [head, body, signature] = segments as [string, string, string];
    const header = decodeSegment<JwtHeader>(head);
    const claims = decodeSegment<JwtClaims>(body);
    if (!header || !claims || !header.kid || !["ES256", "RS256"].includes(header.alg ?? "")) {
      throw new Error("INVALID_TOKEN");
    }
    const now = Math.floor(Date.now() / 1000);
    if (claims.iss !== issuer || !((Array.isArray(claims.aud) ? claims.aud : [claims.aud]).includes(audience)) ||
      typeof claims.exp !== "number" || claims.exp <= now ||
      (typeof claims.nbf === "number" && claims.nbf > now + 30) ||
      (typeof claims.iat === "number" && claims.iat > now + 30) ||
      claims.role !== "authenticated" ||
      typeof claims.sub !== "string" || !uuid.test(claims.sub)) {
      throw new Error("INVALID_TOKEN");
    }
    let matching = (await loadKeys()).find(jwk => jwk.kid === header.kid && (!jwk.alg || jwk.alg === header.alg));
    if (!matching) matching = (await loadKeys(true)).find(jwk => jwk.kid === header.kid && (!jwk.alg || jwk.alg === header.alg));
    if (!matching || (header.alg === "ES256" && matching.kty !== "EC") ||
      (header.alg === "RS256" && matching.kty !== "RSA") || (matching.use && matching.use !== "sig")) {
      throw new Error("INVALID_TOKEN");
    }
    const verifier = createVerify("sha256");
    verifier.update(head + "." + body);
    verifier.end();
    const key = createPublicKey({ key: matching as import("node:crypto").JsonWebKey, format: "jwk" });
    const valid = verifier.verify(header.alg === "ES256" ? { key, dsaEncoding: "ieee-p1363" } : key,
      Buffer.from(signature, "base64url"));
    if (!valid) throw new Error("INVALID_TOKEN");
    return { userId: claims.sub.toLowerCase() };
  };
}

function findUserId(record: unknown): string | undefined {
  return isRecord(record) && typeof record.localUserId === "string" ? record.localUserId : undefined;
}

function requiresUserSession(url: string, method: string) {
  if (method.toUpperCase() === "OPTIONS") return false;
  const pathname = url.split("?")[0] ?? "";
  if (publicPaths.has(pathname)) return false;
  // The partner control plane has its own HMAC + nonce/replay verifier.
  if (pathname === "/internal/v1" || pathname.startsWith("/internal/v1/")) return false;
  return true; // Private by default, including newly added routes.
}

function matchesWorkspace(request: FastifyRequest, userId: string) {
  for (const value of [request.query, request.params, request.body]) {
    const candidate = findUserId(value);
    if (candidate && candidate.toLowerCase() !== userId) return false;
  }
  return true;
}

/**
 * The session subject is the only trusted owner identity. This hook runs
 * before handlers, and checks the user-provided body/query/path workspace ID.
 * A bearer token does NOT authorize access to another user's localUserId.
 */
export function attachUserAuthorization(app: FastifyInstance, settings: AuthSettings, verifyOverride?: VerifyToken) {
  let verify: VerifyToken | null = verifyOverride ?? null;
  let invalidConfig = false;
  if (!verify) {
    try { verify = createSupabaseJwtVerifier(settings); }
    catch { invalidConfig = true; }
  }

  app.addHook("preValidation", async (request, reply) => {
    if (!requiresUserSession(request.url, request.method)) return;
    if (invalidConfig || !verify) {
      return reply.code(503).send({ code: "AUTH_NOT_CONFIGURED", message: "Secure user authentication is not configured." });
    }
    const authorization = request.headers.authorization;
    const match = typeof authorization === "string" ? /^Bearer ([^\s]+)$/i.exec(authorization) : null;
    if (!match?.[1]) return reply.code(401).send({ code: "AUTH_REQUIRED" });
    let identity: VerifiedUser;
    try {
      identity = await verify(match[1]);
    } catch (error) {
      if (error instanceof Error && /^(JWKS_UNAVAILABLE|JWKS_INVALID)$/.test(error.message)) {
        return reply.code(503).send({ code: "AUTH_SERVICE_UNAVAILABLE" });
      }
      return reply.code(401).send({ code: "INVALID_SESSION" });
    }
    authenticatedUsers.set(request, identity.userId);
    if (!matchesWorkspace(request, identity.userId)) {
      return reply.code(403).send({ code: "WORKSPACE_ACCESS_DENIED" });
    }
    // Onboarding identity must be bound to the authenticated subject.
    const pathname = request.url.split("?")[0] ?? "";
    if ((pathname === "/api/onboarding/user" || pathname === "/api/onboarding/users" ||
      pathname === "/onboarding/user" || pathname === "/onboarding/users") &&
      isRecord(request.body)) {
      request.body.localUserId = identity.userId;
    }
  });
}
