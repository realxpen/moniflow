/**
 * BMONI's published Nigerian sandbox identities only.
 * Source: https://embedded-docs.bmoni.com/api-reference/sandbox-test-data/
 *
 * This is test data, NOT permission to create or claim an existing BMONI user.
 * A verified bmoniUserId and provider-owned wallet are still required.
 */
export const BMONI_SANDBOX_PERSONAS = [
  { id: "bunch", firstName: "Bunch", lastName: "Dillon", phoneNumber: "+2348000000000", bvn: "95888168924" },
  { id: "samson", firstName: "Samson", lastName: "Jabo", phoneNumber: "+2348000000001", bvn: "22222222222" }
] as const;

export type SandboxPersonaId = typeof BMONI_SANDBOX_PERSONAS[number]["id"];
export type SandboxPersonaFields = { firstName: string; lastName: string; phoneNumber: string; bvn: string };
export function getSandboxPersona(id: SandboxPersonaId) {
  return BMONI_SANDBOX_PERSONAS.find(persona => persona.id === id)!;
}

/** Fail closed: identity numbers, phone and names MUST resolve to the same published persona. */
export function matchesDocumentedSandboxPersona(input: SandboxPersonaFields): boolean {
  return BMONI_SANDBOX_PERSONAS.some(persona =>
    persona.firstName === input.firstName.trim() &&
    persona.lastName === input.lastName.trim() &&
    persona.phoneNumber === input.phoneNumber.trim() &&
    persona.bvn === input.bvn.trim()
  );
}

export function assertDocumentedSandboxPersona(input: SandboxPersonaFields) {
  if (!matchesDocumentedSandboxPersona(input)) {
    throw new Error("BMONI SANDBOX IDENTITY MISMATCH: Select one published test persona and use its matching name, phone, and BVN. Do not submit real identity data.");
  }
}
