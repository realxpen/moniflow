import { createHash } from "node:crypto";

import { partnerFinancialCommandSchema, partnerIdentifierSchema } from "@moniflow/shared";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import { PartnerCommandConflictError, type PartnerOperationStore } from "../services/partner/operation-store.js";
import { authenticatePartner, PARTNER_MEDIA_TYPE } from "../services/partner/request-auth.js";

type PartnerRouteOptions = { store: PartnerOperationStore; secret: string };
const operationIdSchema = z.object({ operationId: partnerIdentifierSchema }).strict();
const nameToKind = {
  collections: "COLLECTION",
  payouts: "PAYOUT",
  refunds: "REFUND"
} as const;

/**
 * SANDBOX CONTROL PLANE ONLY.
 * These routes persist authenticated intent. No BMONI or other financial
 * provider is invoked; no wallet, custody or settlement state is modified.
 */
export const partnerRoutes: FastifyPluginAsync<PartnerRouteOptions> = async (app, options) => {
  if (!options.secret || options.secret.length < 32) throw new Error("Partner sandbox secret must be 32+ characters");
  app.addContentTypeParser(PARTNER_MEDIA_TYPE, { parseAs: "buffer", bodyLimit: 16_384 },
    (_request, body, done) => done(null, body));

  async function requireIdentity(request: FastifyRequest, reply: FastifyReply) {
    const status = await authenticatePartner(request, options.store, options.secret);
    if (status === "unauthorized") {
      reply.code(401).send({ code: "PARTNER_AUTH_REQUIRED" });
      return false;
    }
    if (status === "replay") {
      reply.code(409).send({ code: "SIGNED_REQUEST_REPLAY" });
      return false;
    }
    return true;
  }

  for (const [route, kind] of Object.entries(nameToKind)) {
    app.post("/" + route, async (request, reply) => {
      if (!await requireIdentity(request, reply)) return reply;
      if (!Buffer.isBuffer(request.body)) {
        return reply.code(415).send({ code: "SIGNED_RAW_JSON_REQUIRED" });
      }
      let input: unknown;
      try {
        input = JSON.parse(request.body.toString("utf8"));
      } catch {
        return reply.code(400).send({ code: "INVALID_JSON" });
      }
      const parsed = partnerFinancialCommandSchema.safeParse(input);
      if (!parsed.success || parsed.data.kind !== kind || parsed.data.partner !== "HUSTLE") {
        return reply.code(400).send({ code: "INVALID_PARTNER_COMMAND" });
      }

      // Stable digest of normalized schema output, not the textual JSON order.
      const digest = createHash("sha256").update(JSON.stringify(parsed.data)).digest("hex");
      try {
        const {operation, duplicate} = await options.store.record(parsed.data, digest);
        return reply.code(duplicate ? 200 : 202).send({
          operationId: operation.operationId,
          kind: operation.kind,
          status: operation.state,
          partner: "HUSTLE",
          environment: "sandbox",
          duplicate,
          simulated: true,
          executionStarted: false,
          realFundsMoved: false,
          providerEvidenceReference: null,
          createdAt: operation.createdAt
        });
      } catch (error) {
        if (error instanceof PartnerCommandConflictError) {
          return reply.code(409).send({ code: "PARTNER_IDEMPOTENCY_CONFLICT" });
        }
        throw error;
      }
    });
  }

  app.get("/operations/:operationId", async (request, reply) => {
    if (!await requireIdentity(request, reply)) return reply;
    const parsed = operationIdSchema.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ code: "INVALID_OPERATION_ID" });
    const operation = await options.store.find("HUSTLE", parsed.data.operationId);
    if (!operation) return reply.code(404).send({ code: "OPERATION_NOT_FOUND" });
    return {
      operationId: operation.operationId, kind: operation.kind, status: operation.state,
      partner: operation.partner, environment: "sandbox",
      simulated: true, executionStarted: false,
      realFundsMoved: false, providerEvidenceReference: null,
      createdAt: operation.createdAt
    };
  });

  app.get("/provider-capabilities", async (request, reply) => {
    if (!await requireIdentity(request, reply)) return reply;
    return {
      version: "1",
      partner: "HUSTLE",
      environment: "sandbox",
      simulated: true,
      acceptedCommandTypes: ["COLLECTION","PAYOUT","REFUND"],
      operationStorage: "DURABLE",
      providerExecutionEnabled: false,
      merchantCollectionsEnabled: false,
      refundsEnabled: false,
      payoutsEnabled: false,
      custodyEnabled: false
    };
  });
};
