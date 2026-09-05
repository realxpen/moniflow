import type { IncomingMessage, ServerResponse } from "node:http";

import { buildApp } from "../src/create-app.js";

const app = buildApp();
const ready = app.ready();

function restoreOriginalUrl(req: IncomingMessage) {
  const incoming = new URL(req.url ?? "/", "http://moniflow.local");
  const rewrittenPath = incoming.searchParams.get("__moniflow_path");

  if (rewrittenPath === null) return;

  incoming.searchParams.delete("__moniflow_path");
  const normalizedPath = rewrittenPath
    ? `/${rewrittenPath.replace(/^\/+/, "")}`
    : "/";
  const query = incoming.searchParams.toString();

  req.url = query ? `${normalizedPath}?${query}` : normalizedPath;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  restoreOriginalUrl(req);
  await ready;
  app.server.emit("request", req, res);
}
