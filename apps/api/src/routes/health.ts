import type { FastifyPluginAsync } from "fastify";

import { env } from "../config/env.js";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health", async () => ({
    status: "ok",
    service: "moniflow-api",
    environment: env.NODE_ENV
  }));
};
