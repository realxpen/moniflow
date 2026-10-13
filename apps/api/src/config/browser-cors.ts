import type { FastifyInstance } from "fastify";

/**
 * Browser-only cross-origin access for the MONIFlow website.
 * CORS is not authentication: all financial routes retain their normal guards.
 * No wildcard origin and no cross-origin cookies/credentials.
 */
export function attachBrowserCors(app: FastifyInstance, configuredOrigins: string) {
  const allowed = new Set(
    configuredOrigins.split(",").map((value) => value.trim()).filter(Boolean)
  );

  app.addHook("onRequest", (request, reply, done) => {
    const origin = request.headers.origin;
    if (origin) {
      reply.header("Vary", "Origin");
      if (allowed.has(origin)) {
        reply.header("Access-Control-Allow-Origin", origin);
      }
    }
    done();
  });

  app.options("/*", async (request, reply) => {
    const origin = request.headers.origin;
    if (!origin || !allowed.has(origin)) {
      return reply.code(403).send({ error: "origin_not_allowed" });
    }
    reply.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    reply.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    reply.header("Access-Control-Max-Age", "600");
    return reply.code(204).send();
  });
}
