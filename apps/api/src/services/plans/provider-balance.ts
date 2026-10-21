/**
 * One conservative source of truth for provider-reported CNGN spendable
 * balances. Ambiguous currency records, malformed comma groupings, exponent
 * strings, signed values and sub-kobo precision never become spendable funds.
 *
 * A balance response is account data, NOT authority to execute.
 */
export function readCngnAvailableBalance(payload: unknown): number | null {
  const matches: Record<string, unknown>[] = [];
  const seen = new WeakSet<object>();
  const walk = (value: unknown, depth: number): void => {
    if (depth > 10 || !value || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const child of value) walk(child, depth + 1);
      return;
    }
    const record = value as Record<string, unknown>;
    const currency = ["currency", "symbol", "asset", "token", "code"]
      .map((key) => record[key])
      .find((v) => typeof v === "string" && v.trim().toUpperCase() === "CNGN");
    if (currency) {
      matches.push(record);
      return;
    }
    for (const child of Object.values(record)) walk(child, depth + 1);
  };
  walk(payload, 0);
  if (matches.length !== 1) return null;
  const record = matches[0]!;
  // An explicit available amount is preferable to total/held funds.
  const raw = ["availableBalance", "available", "balance", "amount", "total"]
    .map((key) => record[key]).find((v) => v !== undefined && v !== null);
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const input = String(raw);
  const valid = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(input) ||
    /^(?:[1-9]\d{0,2})(?:,\d{3})+(?:\.\d{1,2})?$/.test(input);
  if (!valid) return null;
  const amount = Number(input.replace(/,/g, ""));
  return Number.isFinite(amount) && Number.isSafeInteger(Math.round(amount * 100)) && amount >= 0
    ? amount : null;
}
