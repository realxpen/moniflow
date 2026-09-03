import { z } from "zod";

const e164PhoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/, "Expected an E.164 phone number");
const optionalText = z.string().min(1).optional();
const nullableText = z.string().nullable().optional();

export const createBmoniUserInputSchema = z
  .object({
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
  })
  .strict();

export type CreateBmoniUserInput = z.infer<typeof createBmoniUserInputSchema>;

export const bmoniUserSchema = z
  .object({
    id: z.string().min(1),
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
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime()
  })
  .strict();

export type BmoniUser = z.infer<typeof bmoniUserSchema>;

export const createBmoniUserResponseSchema = z
  .object({ user: bmoniUserSchema })
  .strict();

export const supportedSmartWalletCurrenciesSchema = z
  .object({
    currencies: z.array(z.string().regex(/^[A-Za-z0-9]+$/)).min(1)
  })
  .strict();

export type SupportedSmartWalletCurrencies = z.infer<
  typeof supportedSmartWalletCurrenciesSchema
>;

export const bmoniErrorEnvelopeSchema = z
  .object({
    statusCode: z.number().int(),
    message: z.union([z.string(), z.array(z.string())]),
    error: z.string().optional()
  })
  .strict();

export type BmoniErrorEnvelope = z.infer<typeof bmoniErrorEnvelopeSchema>;
