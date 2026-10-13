import { makeReceiptEvent, signReceiptEvidence } from "./receipt-evidence.js";
import { PostgresReceiptOutbox, SqliteReceiptOutbox } from "./receipt-outbox.js";
import { PostgresPartnerOperationStore } from "./postgres-store.js";
import { SqlitePartnerOperationStore } from "./sqlite-store.js";

/**
 * EXPLICIT test-only, one-operation-at-a-time, receipt-only delivery. Never
 * runs during API startup and never sends provider success, failure or funds.
 * A lost HTTP response may be retried after lease expiration. Hustle dedups.
 */
export async function deliverOneSandboxReceipt(config:{
  databaseUrl:string;
  targetUrl:string;
  secret:string;
  now?:number;
}):Promise<{state:"EMPTY"|"DELIVERED"|"RETRY_PENDING";operationId?:string}> {
  if (process.env.NODE_ENV!=="test" || config.secret.length<32) {
    throw new Error("MONIFLOW_RECEIPT_DELIVERY_TEST_ONLY");
  }
  const url=new URL(config.targetUrl);
  if (url.protocol!=="http:" || url.hostname!=="127.0.0.1" ||
      !url.port || url.pathname!=="/api/v1/payments/partner-sandbox/received" ||
      url.username || url.password || url.search || url.hash) {
    throw new Error("MONIFLOW_RECEIPT_DELIVERY_LOOPBACK_ONLY");
  }
  if (!config.databaseUrl.startsWith("file:") &&
      !config.databaseUrl.startsWith("postgres") &&
      config.databaseUrl!==":memory:") {
    throw new Error("UNSUPPORTED_RECEIPT_DATABASE");
  }
  const isPostgres=config.databaseUrl.startsWith("postgres");
  const store=isPostgres
    ? new PostgresPartnerOperationStore(config.databaseUrl)
    : new SqlitePartnerOperationStore(config.databaseUrl);
  const outbox=isPostgres
    ? new PostgresReceiptOutbox(config.databaseUrl)
    : new SqliteReceiptOutbox(config.databaseUrl);
  try {
    await store.ready;
    // Recover outbox rows from committed operations, including a crash gap.
    await outbox.sync();
    const item=await outbox.claim(config.now);
    if (!item) return {state:"EMPTY"};
    try {
      const operation=await store.find("HUSTLE",item.operationId);
      if (!operation) throw new Error("MISSING_IMMUTABLE_PARTNER_COMMAND");
      const raw=Buffer.from(JSON.stringify(makeReceiptEvent(operation)),"utf8");
      const signature=signReceiptEvidence(config.secret,raw);
      const response=await fetch(url,{
        method:"POST",redirect:"error",signal:AbortSignal.timeout(5000),
        headers:{
          "content-type":"application/json",
          "x-moniflow-receipt-signature":signature
        },
        body:raw
      });
      if (response.status!==200) throw new Error("RECEIPT_INBOX_DENIED");
      const result:unknown=await response.json();
      if (!result || typeof result!=="object" ||
          (result as Record<string,unknown>).operationId!==operation.operationId ||
          (result as Record<string,unknown>).eventId!==`moniflow.received:${operation.operationId}` ||
          (result as Record<string,unknown>).status!=="RECEIVED" ||
          (result as Record<string,unknown>).realFundsMoved!==false ||
          (result as Record<string,unknown>).financialStateUnchanged!==true) {
        throw new Error("INVALID_RECEIPT_ACK");
      }
      await outbox.delivered(item.operationId);
      return {state:"DELIVERED",operationId:item.operationId};
    } catch {
      await outbox.retryLater(item.operationId, config.now);
      return {state:"RETRY_PENDING",operationId:item.operationId};
    }
  } finally {
    await Promise.all([store.close(),outbox.close()]);
  }
}
