import { z } from "zod";

const e164PhoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/, "Expected an E.164 phone number");
const evmAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const hexSignatureSchema = z.string().regex(/^0x[a-fA-F0-9]+$/);
const optionalText = z.string().min(1).optional();
const nullableText = z.string().nullable().optional();

export const createBmoniUserInputSchema = z.object({
  employeeId: optionalText, identityId: optionalText, firstName: z.string().trim().min(1), lastName: optionalText,
  middleName: optionalText, email: z.email(), phoneNumber: e164PhoneSchema, bvn: z.string().regex(/^\d{11}$/).optional(),
  monthlySalary: z.string().regex(/^\d+(?:\.\d{1,2})?$/).optional(), employerName: optionalText, occupation: optionalText,
  addressStreet: optionalText, addressCity: optionalText, addressState: optionalText, addressCountry: optionalText, addressPostalCode: optionalText
}).strict();
export type CreateBmoniUserInput = z.infer<typeof createBmoniUserInputSchema>;

export const bmoniUserSchema = z.object({
  id: z.string().min(1), partnerName: nullableText, employeeId: nullableText, identityId: nullableText,
  bmoniUserId: z.string().min(1), firstName: z.string().min(1), lastName: nullableText, middleName: nullableText,
  email: z.email(), phoneNumber: nullableText, employerName: nullableText, occupation: nullableText, monthlySalary: nullableText,
  linkedAt: z.iso.datetime().nullable().optional(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime()
}).strict();
export type BmoniUser = z.infer<typeof bmoniUserSchema>;
export const createBmoniUserResponseSchema = z.object({ user: bmoniUserSchema }).strict();

export const supportedSmartWalletCurrenciesSchema = z.object({ currencies: z.array(z.string().regex(/^[A-Za-z0-9]+$/)).min(1) }).strict();
export type SupportedSmartWalletCurrencies = z.infer<typeof supportedSmartWalletCurrenciesSchema>;

export const ownerProofChallengeInputSchema = z.object({ currency: z.literal("CNGN"), userOwnerAddress: evmAddressSchema }).strict();
export type OwnerProofChallengeInput = z.infer<typeof ownerProofChallengeInputSchema>;
export const ownerProofChallengeResponseSchema = z.object({ challengeId: z.string().min(1), message: z.string().min(1) }).passthrough();
export type OwnerProofChallenge = z.infer<typeof ownerProofChallengeResponseSchema>;

export const createManagedWalletInputSchema = z.object({
  currency: z.literal("CNGN"), userOwnerAddress: evmAddressSchema,
  ownerProofChallengeId: z.string().min(1), ownerProofSignature: hexSignatureSchema
}).strict();
export type CreateManagedWalletInput = z.infer<typeof createManagedWalletInputSchema>;

export const managedSmartWalletSchema = z.object({
  id: z.string().min(1).optional(), smartWalletId: z.string().min(1).optional(), address: evmAddressSchema,
  chain: z.string().min(1).optional(), currency: z.string().min(1), status: z.string().min(1).optional()
}).passthrough().refine((value) => Boolean(value.id ?? value.smartWalletId), { message: "Smart wallet identifier is missing." });
export type ManagedSmartWallet = z.infer<typeof managedSmartWalletSchema>;

export const managedSmartWalletResponseSchema = z.union([
  managedSmartWalletSchema,
  z.object({ smartWallet: managedSmartWalletSchema }).passthrough().transform((value) => value.smartWallet),
  z.object({ wallet: managedSmartWalletSchema }).passthrough().transform((value) => value.wallet)
]);

export const bmoniErrorEnvelopeSchema = z.object({
  statusCode: z.number().int(), message: z.union([z.string(), z.array(z.string())]), error: z.string().optional()
}).strict();
export type BmoniErrorEnvelope = z.infer<typeof bmoniErrorEnvelopeSchema>;
