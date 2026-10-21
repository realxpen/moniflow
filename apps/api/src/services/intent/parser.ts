import {
  moniflowIntentSchema,
  type AtomicIntent,
  type MoniflowIntent
} from "../../schemas/intent.js";

const BANK_ALIASES: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(?:gtbank|gt bank|guaranty trust bank)\b/i, label: "GTBank" },
  { pattern: /\baccess bank\b/i, label: "Access Bank" },
  { pattern: /\bzenith(?: bank)?\b/i, label: "Zenith Bank" },
  { pattern: /\b(?:uba|united bank for africa)\b/i, label: "UBA" },
  { pattern: /\b(?:firstbank|first bank)\b/i, label: "FirstBank" }
];

export function parseIntent(rawInput: string): MoniflowIntent {
  const input = normalizeWhitespace(rawInput).replace(/[.!?]$/, "").trim();
  if (input.length > 500) return validated({ intent: "UNSUPPORTED", requiresApproval: false, reason: "AMBIGUOUS" });
  if (!input) return validated({ intent: "UNSUPPORTED", requiresApproval: false, reason: "EMPTY" });

  const clauses = splitActionClauses(input);
  if (clauses.length > 5 || clauses.some((clause) => !clause)) {
    return validated({ intent: "UNSUPPORTED", requiresApproval: false, reason: "AMBIGUOUS" });
  }
  if (clauses.length > 1) {
    const actions: AtomicIntent[] = [];
    for (const clause of clauses) {
      const parsed = parseAtomic(clause);
      if (!parsed) {
        return validated({ intent: "UNSUPPORTED", requiresApproval: false, reason: "AMBIGUOUS" });
      }
      actions.push(parsed);
    }
    if (actions.length >= 2) {
      return validated({
        intent: "MULTI_ACTION",
        actions,
        requiresApproval: actions.some((action) => action.requiresApproval)
      });
    }
  }

  // A dangling connector is an incomplete compound command, not an atomic one.
  if (/\b(?:and then|and|then)$/i.test(input)) {
    return validated({ intent: "UNSUPPORTED", requiresApproval: false, reason: "AMBIGUOUS" });
  }
  const atomic = parseAtomic(input);
  if (atomic) return validated(atomic);

  const looksIncomplete = /\b(?:withdraw|save|allocate|put|create|make)\b/i.test(input);
  return validated({
    intent: "UNSUPPORTED",
    requiresApproval: false,
    reason: looksIncomplete ? "INCOMPLETE_ACTION" : "UNSUPPORTED_ACTION"
  });
}

function parseAtomic(input: string): AtomicIntent | null {
  return (
    parseBalance(input) ??
    parseWithdrawal(input) ??
    parseCreatePocket(input) ??
    parseAllocatePocket(input) ??
    parseActivity(input)
  );
}

function parseBalance(input: string): AtomicIntent | null {
  if (
    /^(?:check|show|what(?:'s| is)|tell me)\s+(?:my\s+)?(?:available\s+)?balance\??$/i.test(input) ||
    /^(?:how much (?:money )?do i have|how much is in my wallet)\??$/i.test(input)
  ) {
    return { intent: "CHECK_BALANCE", currency: "NGN", requiresApproval: false };
  }
  return null;
}

function parseWithdrawal(input: string): AtomicIntent | null {
  const match = input.match(/^withdraw\s+(.+?)\s+to\s+(?:my\s+)?(.+)$/i);
  if (!match?.[1] || !match[2]) return null;

  // Match the entire command: never silently ignore trailing instructions.
  const amount = parseAmount(match[1]);
  const bank = parseSavedBank(match[2]);
  if (amount === null || !bank) return null;

  return {
    intent: "BANK_WITHDRAWAL",
    currency: "NGN",
    amount,
    destination: { kind: "SAVED_BANK", label: bank },
    requiresApproval: true
  };
}

function parseCreatePocket(input: string): AtomicIntent | null {
  const patterns = [
    /^(?:create|make)\s+(?:a\s+)?(?:new\s+)?(?:pocket|money space)\s+(?:for|called|named)\s+(.+)$/i,
    /^(?:create|make)\s+(?:a\s+)?(.+?)\s+(?:pocket|money space)$/i
  ];
  for (const pattern of patterns) {
    const match = input.match(pattern);
    const capturedName = match?.[1];
    if (!capturedName) continue;
    const name = normalizePocketName(capturedName);
    if (!name) return null;
    return { intent: "CREATE_POCKET", pocket: { name }, requiresApproval: false };
  }
  return null;
}

function parseAllocatePocket(input: string): AtomicIntent | null {
  const match = input.match(
    /^(?:save|allocate|put)\s+(.+?)\s+(?:(?:for|towards)\s+(.+)|(?:into|in|to)\s+(?:my\s+)?(.+?)\s+(?:pocket|money space))$/i
  );
  if (!match?.[1]) return null;
  const amount = parseAmount(match[1]);
  const capturedName = match[2] ?? match[3];
  if (amount === null || !capturedName) return null;
  const name = normalizePocketName(capturedName);
  if (!name) return null;
  return {
    intent: "ALLOCATE_POCKET",
    currency: "NGN",
    amount,
    pocket: { name },
    requiresApproval: false
  };
}

function parseActivity(input: string): AtomicIntent | null {
  if (
    /^(?:show|open|see)\s+(?:my\s+)?(?:recent\s+)?(?:activity|transactions|transaction history)$/i.test(input) ||
    /^(?:recent activity|transaction history)$/i.test(input)
  ) {
    return { intent: "SHOW_ACTIVITY", requiresApproval: false };
  }
  return null;
}

function parseAmount(value: string): number | null {
  // Supported syntax: ₦40,000, NGN 40000, ₦40k, 40k, 1.5m.
  // Currency prefix or compact k/m suffix is required. No sub-naira amounts.
  const match = value.match(
    /^(₦|ngn\s*)?((?:[1-9][0-9]*|[1-9][0-9]{0,2}(?:,[0-9]{3})+)(?:\.[0-9]{1,2})?)\s*([km])?$/i
  );
  if (!match?.[2] || (!match[1] && !match[3])) return null;
  const base = Number(match[2].replace(/,/g, ""));
  const multiplier = match[3]?.toLowerCase() === "k" ? 1_000 :
    match[3]?.toLowerCase() === "m" ? 1_000_000 : 1;
  const amount = base * multiplier;
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

function parseSavedBank(value: string): string | null {
  // Bank names must occupy the complete beneficiary label, not merely occur
  // somewhere inside an unsupported instruction.
  const normalized = value.trim().replace(/\s+account$/i, "");
  const matching = BANK_ALIASES.filter(({ pattern }) => {
    const match = normalized.match(pattern);
    return match !== null && match[0].length === normalized.length;
  });
  return matching.length === 1 ? matching[0]?.label ?? null : null;
}

function splitActionClauses(input: string): string[] {
  // Retain empty clauses and counts, so a trailing or excessive action does
  // not quietly degrade to a plausible single action.
  return input.split(/\s+(?:and then|then|and)\s+/i).map((clause) => clause.trim());
}

function normalizePocketName(value: string): string | null {
  const name = value
    .replace(/^my\s+/i, "")
    .replace(/\s+(?:pocket|money space)$/i, "")
    .replace(/[?.!,]+$/g, "")
    .trim();
  if (!name || name.length > 48) return null;
  if (!/^[a-z0-9][a-z0-9 &'_-]*$/i.test(name)) return null;
  return name.replace(/\b\w/g, (character) => character.toUpperCase());
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function validated(value: MoniflowIntent): MoniflowIntent {
  return moniflowIntentSchema.parse(value);
}
