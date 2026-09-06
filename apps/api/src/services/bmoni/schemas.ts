import { z } from "zod";

const e164PhoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/, "Expected an E.164 phone number");
const evmAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const hexSignatureSchema = z.string().regex(/^0x[a-fA-F0-9]+$/);
const optionalText = z.string().trim().min(1).optional();
const nullableText = z.string().nullable().optional();

export const createBmoniUserInputSchema = z.object({
  employeeId: optionalText,
  identityId: optionalText,
  firstName: z.string().trim().min(1),
  lastName: optionalText,
  middleName: optionalText,
  email: z.email(),
  phoneNumber: e164PhoneSchema,
  bvn: z.string().regex(/^\d{11}$/).optional(),
  monthlySalary: z.string().regex(/^\d+(?:\.\d{1,2})?$/).optional(),
  employerName: optionalText,
  occupation: optionalText,
  addressStreet: optionalText,
  addressCity: optionalText,
  addressState: optionalText,
  addressCountry: optionalText,
  addressPostalCode: optionalText
}).strict();
export type CreateBmoniUserInput = z.infer<typeof createBmoniUserInputSchema>;

export const bmoniUserSchema = z.object({
  id: z.string().min(1).optional(),
  company: nullableText,
  partnerName: nullableText,
  employeeId: nullableText,
  identityId: nullableText,
  bmoniUserId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: nullableText,
  middleName: nullableText,
  email: z.email(),
  phoneNumber: nullableText,
  employerName: nullableText,
  occupation: nullableText,
  monthlySalary: nullableText,
  linkedAt: z.iso.datetime().nullable().optional(),
  createdAt: z.iso.datetime().optional(),
  updatedAt: z.iso.datetime().optional()
}).passthrough();
export type BmoniUser = z.infer<typeof bmoniUserSchema>;

export const createBmoniUserResponseSchema = z.union([
  z.object({ user: bmoniUserSchema }).passthrough(),
  bmoniUserSchema.transform((user) => ({ user }))
]);

export const supportedSmartWalletCurrenciesSchema = z.object({
  currencies: z.array(z.string().regex(/^[A-Za-z0-9]+$/)).min(1)
}).passthrough();
export type SupportedSmartWalletCurrencies = z.infer<typeof supportedSmartWalletCurrenciesSchema>;

export const ownerProofChallengeInputSchema = z.object({
  currency: z.literal("CNGN"),
  userOwnerAddress: evmAddressSchema
}).strict();
export type OwnerProofChallengeInput = z.infer<typeof ownerProofChallengeInputSchema>;

const ownerProofChallengeSchema = z.object({
  challengeId: z.string().min(1),
  message: z.string().min(1)
}).passthrough();
export const ownerProofChallengeResponseSchema = z.union([
  ownerProofChallengeSchema,
  z.object({ challenge: ownerProofChallengeSchema }).passthrough().transform((value) => value.challenge),
  z.object({ ownerProofChallenge: ownerProofChallengeSchema }).passthrough().transform((value) => value.ownerProofChallenge)
]);
export type OwnerProofChallenge = z.infer<typeof ownerProofChallengeResponseSchema>;

export const createManagedWalletInputSchema = z.object({
  currency: z.literal("CNGN"),
  userOwnerAddress: evmAddressSchema,
  ownerProofChallengeId: z.string().min(1),
  ownerProofSignature: hexSignatureSchema
}).strict();
export type CreateManagedWalletInput = z.infer<typeof createManagedWalletInputSchema>;

const managedSmartWalletRawSchema = z.object({
  id: z.string().min(1).optional(),
  smartWalletId: z.string().min(1).optional(),
  walletId: z.string().min(1).optional(),
  groupWalletId: z.string().min(1).optional(),
  address: evmAddressSchema.optional(),
  walletAddress: evmAddressSchema.optional(),
  smartAccountAddress: evmAddressSchema.optional(),
  safeAddress: evmAddressSchema.optional(),
  chain: z.string().min(1).optional(),
  currency: z.string().min(1),
  status: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  createdAt: z.string().min(1).optional()
}).passthrough()
  .refine((value) => Boolean(value.id ?? value.smartWalletId ?? value.walletId ?? value.groupWalletId), {
    message: "Smart wallet identifier is missing."
  })
  .refine((value) => Boolean(value.address ?? value.walletAddress ?? value.smartAccountAddress ?? value.safeAddress), {
    message: "Smart wallet address is missing."
  })
  .transform((value) => ({
    ...value,
    smartWalletId: value.smartWalletId ?? value.walletId ?? value.groupWalletId ?? value.id,
    address: value.address ?? value.walletAddress ?? value.smartAccountAddress ?? value.safeAddress!,
    status: value.status ?? (value.isActive ? "active" : "preparing")
  }));

export type ManagedSmartWallet = z.infer<typeof managedSmartWalletRawSchema>;
export const managedSmartWalletResponseSchema = z.union([
  managedSmartWalletRawSchema,
  z.object({ smartWallet: managedSmartWalletRawSchema }).passthrough().transform((value) => value.smartWallet),
  z.object({ wallet: managedSmartWalletRawSchema }).passthrough().transform((value) => value.wallet),
  z.object({ groupWallet: managedSmartWalletRawSchema }).passthrough().transform((value) => value.groupWallet)
]);

export const bvnLookupSchema = z.object({
  bvn: z.string().regex(/^\d{11}$/),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  middleName: z.string().nullable().optional(),
  dateOfBirth: z.string().min(1),
  gender: z.string().min(1),
  email: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional()
}).passthrough();
export type BvnLookup = z.infer<typeof bvnLookupSchema>;

const nigeriaIdentificationNumberSchema = z.object({
  type: z.literal("bvn"),
  number: z.string().regex(/^\d{11}$/),
  issuingCountryCode: z.literal("NGA")
}).strict();

export const updateNigeriaKycInputSchema = z.object({
  personalInfo: z.object({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    middleName: optionalText,
    phoneNumber: e164PhoneSchema,
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    gender: z.string().trim().min(1)
  }).strict(),
  address: z.object({
    streetLine1: z.string().trim().min(1),
    streetLine2: optionalText,
    city: z.string().trim().min(1),
    state: z.string().trim().min(1),
    postalCode: z.string().trim().min(1),
    countryCode: z.literal("NGA")
  }).strict(),
  employment: z.object({
    occupationCode: z.string().trim().min(1),
    employerName: z.string().trim().min(1),
    employmentStatus: z.string().trim().min(1)
  }).strict(),
  sourceOfFunds: z.string().trim().min(1),
  estimatedMonthlyVolume: z.number().int().nonnegative(),
  accountPurpose: z.string().trim().min(1),
  actingAsIntermediary: z.boolean(),
  identificationNumbers: z.array(nigeriaIdentificationNumberSchema).length(1)
}).strict();
export type UpdateNigeriaKycInput = z.infer<typeof updateNigeriaKycInputSchema>;

export const kycProfileResponseSchema = z.unknown();
export type KycProfileResponse = z.infer<typeof kycProfileResponseSchema>;

export const startNigeriaOnboardingInputSchema = z.object({
  bvn: z.string().regex(/^\d{11}$/),
  ngnWalletAddress: evmAddressSchema,
  ngnWalletIndex: z.number().int().nonnegative()
}).strict();
export type StartNigeriaOnboardingInput = z.infer<typeof startNigeriaOnboardingInputSchema>;

export const startNigeriaOnboardingResponseSchema = z.unknown();
export type StartNigeriaOnboardingResponse = z.infer<typeof startNigeriaOnboardingResponseSchema>;

export const onboardingStatusSchema = z.record(z.string(), z.unknown());
export type OnboardingStatus = z.infer<typeof onboardingStatusSchema>;

export const bmoniErrorEnvelopeSchema = z.object({
  statusCode: z.number().int(),
  message: z.union([z.string(), z.array(z.string())]),
  error: z.string().optional()
}).passthrough();
export type BmoniErrorEnvelope = z.infer<typeof bmoniErrorEnvelopeSchema>;
