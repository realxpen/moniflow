import type { SupportedIntent } from "@moniflow/shared";

export type NormalizedInstruction = {
  original: string;
  normalized: string;
};

export type ParsedFinancialIntent = {
  intent: SupportedIntent;
  requiresApproval: boolean;
};

/**
 * Phase 1 contract only. Implementations may parse instructions but must never
 * perform, authorize, or dispatch a financial operation.
 */
export interface IntentEngine {
  parse(instruction: NormalizedInstruction): Promise<ParsedFinancialIntent>;
}
