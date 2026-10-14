import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";
import { SandboxActionError, SANDBOX_COMMAND, transitionSandbox } from "../services/sandbox-demo/state.js";
import type { SandboxDemoStore } from "../services/sandbox-demo/workspace-store.js";

const planSchema = z.object({ command: z.string().max(240) }).strict();
const paramsSchema = z.object({ planId: z.uuid() }).strict();
const approveSchema = z.object({
  expectedPlanHash: z.string().regex(/^[a-f0-9]{64}$/),
  acknowledged: z.literal(true)
}).strict();
const resetSchema = z.object({ acknowledgment: z.literal("RESET_SIMULATED_WORKSPACE") }).strict();

type DemoOptions = {
  store: SandboxDemoStore;
  // Runtime uses ONLY the user ID verified by the production JWT hook.
  getVerifiedUserId: (request: FastifyRequest) => string | null;
};

/** Isolated demo namespace; no BMONI user/wallet/transfer dependencies anywhere. */
export const authenticatedSandboxDemoRoutes: FastifyPluginAsync<DemoOptions> = async (app, options) => {
  function owner(request: FastifyRequest, reply: { code: (code: number) => { send: (payload: unknown) => unknown } }) {
    const userId = options.getVerifiedUserId(request);
    if (!userId) {
      reply.code(401).send({ code: "AUTH_REQUIRED", message: "Sign in to access your isolated demo." });
      return null;
    }
    return userId;
  }
  async function change(userId: string, reply: { code: (code: number) => { send: (payload: unknown) => unknown }; send: (payload: unknown) => unknown },
    mutation: Parameters<SandboxDemoStore["mutate"]>[1]) {
    try {
      const state = await options.store.mutate(userId, mutation);
      if (!state) return reply.code(404).send({ code: "SANDBOX_NOT_STARTED", message: "Start your simulated workspace first." });
      return reply.send(state);
    } catch (error) {
      if (error instanceof SandboxActionError) {
        return reply.code(error.statusCode).send({ code: error.code, message: error.message });
      }
      throw error;
    }
  }
  app.get("/status", async (request, reply) => {
    const userId = owner(request, reply);
    if (!userId) return;
    const state = await options.store.find(userId);
    if (!state) return reply.code(404).send({ code: "SANDBOX_NOT_STARTED", message: "Start an isolated simulated workspace first." });
    return reply.send(state);
  });
  app.post("/bootstrap", async (request, reply) => {
    const userId = owner(request, reply);
    if (!userId) return;
    if (request.body !== undefined && (typeof request.body !== "object" || request.body === null || Object.keys(request.body).length)) {
      return reply.code(400).send({ code: "INVALID_REQUEST", message: "No identity or funding arguments are accepted." });
    }
    return reply.send(await options.store.bootstrap(userId));
  });
  app.post("/plan", async (request, reply) => {
    const userId = owner(request, reply);
    if (!userId) return;
    const input = planSchema.safeParse(request.body);
    if (!input.success) return reply.code(400).send({ code: "INVALID_PLAN", message: "A single example command is required." });
    return change(userId, reply, state => transitionSandbox(state, { kind: "plan", command: input.data.command }));
  });
  app.post<{ Params: unknown; Body: unknown }>("/plans/:planId/approve", async (request, reply) => {
    const userId = owner(request, reply);
    if (!userId) return;
    const params = paramsSchema.safeParse(request.params);
    const body = approveSchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.code(400).send({ code: "APPROVAL_REQUIRES_CONSENT", message: "A plan ID, exact fingerprint and affirmative acknowledgment are required." });
    }
    return change(userId, reply, state => transitionSandbox(state, {
      kind: "approve", planId: params.data.planId, expectedPlanHash: body.data.expectedPlanHash, acknowledged: true
    }));
  });
  app.post<{ Params: unknown }>("/plans/:planId/simulate", async (request, reply) => {
    const userId = owner(request, reply);
    if (!userId) return;
    const params = paramsSchema.safeParse(request.params);
    if (!params.success || (request.body !== undefined && (typeof request.body !== "object" || request.body === null || Object.keys(request.body).length))) {
      return reply.code(400).send({ code: "INVALID_REQUEST", message: "A valid sandbox plan reference is required." });
    }
    return change(userId, reply, state => transitionSandbox(state, { kind: "execute", planId: params.data.planId }));
  });
  app.post("/reset", async (request, reply) => {
    const userId = owner(request, reply);
    if (!userId) return;
    const body = resetSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ code: "RESET_ACKNOWLEDGMENT_REQUIRED", message: "Confirm that only your simulated funds and activity will reset." });
    return change(userId, reply, state => transitionSandbox(state, { kind: "reset", acknowledgment: "RESET_SIMULATED_WORKSPACE" }));
  });
};

export const sandboxDemoDescription = {
  provider: "moniflow-sandbox", simulated: true, command: SANDBOX_COMMAND
} as const;
