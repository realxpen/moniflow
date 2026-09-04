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

const MONEY_PATTERN = /(?:₦|ngn\s*)?([0-9][0-9,]*(?:\.\d{1,2})?)\s*([km])?/i;

export function parseIntent(rawInput: string): MoniflowIntent {
  const input = normalizeWhitespace(rawInput);
  if (!input) return validated({ intent: "UNSUPPORTED", requiresApproval: false, reason: "EMPTY" });

  const clauses = splitActionClauses(input);
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
  if (!/^withdraw\b/i.test(input)) return null;
  const amount = parseAmount(input);
  const bank = parseSavedBank(input);
  if (!amount || !bank) return null;
  if (!/\bto\b/i.test(input)) return null;

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
  if (!/^(?:save|allocate|put)\b/i.test(input)) return null;
  const amount = parseAmount(input);
  if (!amount) return null;

  const patterns = [
    /\b(?:for|towards)\s+(.+?)(?:\s+(?:pocket|money space))?$/i,
    /\b(?:into|in|to)\s+(?:my\s+)?(.+?)\s+(?:pocket|money space)$/i
  ];
  for (const pattern of patterns) {
    const match = input.match(pattern);
    const capturedName = match?.[1];
    if (!capturedName) continue;
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
  return null;
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

function parseAmount(input: string): number | null {
  const currencyAware = input.match(/(?:₦|ngn\s*)[0-9][0-9,]*(?:\.\d{1,2})?\s*[km]?/i);
  const compactNaira = input.match(/\b[0-9][0-9,]*(?:\.\d{1,2})?\s*[km]\b/i);
  const candidate = currencyAware?.[0] ?? compactNaira?.[0];
  if (!candidate) return null;
  const match = candidate.match(MONEY_PATTERN);
  const numericPart = match?.[1];
  if (!numericPart) return null;

  const base = Number.parseFloat(numericPart.replace(/,/g, ""));
  if (!Number.isFinite(base) || base <= 0) return null;
  const multiplier = match?.[2]?.toLowerCase() === "k" ? 1_000 : match?.[2]?.toLowerCase() === "m" ? 1_000_000 : 1;
  const amount = base * multiplier;
  return Number.isSafeInteger(amount) ? amount : null;
}

function parseSavedBank(input: string): string | null {
  const matches = BANK_ALIASES.filter(({ pattern }) => pattern.test(input));
  return matches.length === 1 ? matches[0]?.label ?? null : null;
}

function splitActionClauses(input: string): string[] {
  const clauses = input
    .split(/\s+(?:and then|then|and)\s+/i)
    .map((clause) => clause.trim())
    .filter(Boolean);
  return clauses.length > 5 ? [input] : clauses;
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
