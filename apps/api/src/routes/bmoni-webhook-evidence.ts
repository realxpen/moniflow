import type { FastifyPluginAsync } from "fastify";

import {
  verifySandboxBmoniWebhook
} from "../services/bmoni/webhook-evidence.js";
import type { BmoniEvidenceStore } from "../services/bmoni/webhook-evidence-store.js";

/**
 * An isolated, TEST-ONLY endpoint. BMONI is NOT subscribed to this route.
 * It records provider-format fixture observations, never settles financial
 * operations, never updates wallet state and never calls external APIs.
 */
export const bmoniWebhookEvidenceRoutes: FastifyPluginAsync<{
  store: BmoniEvidenceStore;
  secretKey: string;
}> = async (app, { store, secretKey }) => {
  // Override only this encapsulated plugin's JSON parser. Raw bytes, not
  // parsed-and-recreated JSON, are the documented HMAC input.
  app.addContentTypeParser(
    "application/json", { parseAs: "buffer", bodyLimit: 64 * 1024 },
    (_req, rawBody, done) => done(null, rawBody)
  );

  app.post("/received", async (request, reply) => {
    if (process.env.NODE_ENV !== "test") {
      return reply.code(404).send({ code:"NOT_FOUND" });
    }
    let observation;
    try {
      observation=verifySandboxBmoniWebhook(
        request.body as Buffer,
        request.headers["x-webhook-signature"] as string | undefined,
        request.headers["x-webhook-id"] as string | undefined,
        request.headers["x-source-event-id"] as string | undefined,
        secretKey
      );
    } catch {
      return reply.code(401).send({ code:"UNTRUSTED_BMONI_SANDBOX_DELIVERY" });
    }

    try {
      const result=await store.record(observation);
      return reply.code(200).send({
        accepted:true,
        duplicate:result.duplicate,
        eventId:result.eventId,
        evidenceStatus:"TEST_OBSERVATION_ONLY",
        providerSettlementConfirmed:false,
        hustleFinancialStateUnchanged:true
      });
    } catch (error) {
      if (error instanceof Error && error.message==="BMONI_EVENT_CONFLICT") {
        return reply.code(409).send({ code:"BMONI_EVENT_REPLAY_CONFLICT" });
      }
      // 5xx tells the provider (when a future, explicitly approved, authentic
      // webhook is connected) that an infrastructure failure is retryable.
      return reply.code(503).send({ code:"WEBHOOK_EVIDENCE_STORE_UNAVAILABLE" });
    }
  });
};
