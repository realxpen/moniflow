import type { FastifyInstance, FastifyPluginAsync, FastifyReply } from "fastify";
import { z } from "zod";

import type { WalletOwnershipRepository } from "../repositories/wallet-ownership.js";
import {
  BmoniConfigurationError,
  BmoniProviderError,
  BmoniResponseValidationError,
  BmoniTransportError,
  type BmoniGateway,
  type BmoniUploadFile
} from "../services/bmoni/index.js";
import { BmoniUserService } from "../services/bmoni/user-service.js";

const localUserIdSchema = z.uuid();
const e164PhoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/);
const nigeriaBodySchema = z.object({
  localUserId: localUserIdSchema,
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phoneNumber: e164PhoneSchema,
  bvn: z.string().regex(/^\d{11}$/),
  address: z.object({
    streetLine1: z.string().trim().min(1),
    city: z.string().trim().min(1),
    state: z.string().trim().min(1),
    postalCode: z.string().regex(/^\d{6}$/),
    countryCode: z.literal("NGA")
  }).strict()
}).strict();
const activateBodySchema = z.object({ localUserId: localUserIdSchema, bvn: z.string().regex(/^\d{11}$/) }).strict();
const identificationTypes = new Set(["passport", "drivers_license", "national_id"]);
const proofTypes = new Set(["utility_bill", "bank_statement", "government_letter", "tax_document", "lease_agreement"]);
const allowedImageTypes = new Set(["image/jpeg", "image/png"]);

type NigeriaOnboardingRouteOptions = {
  getBmoniGateway: () => BmoniGateway;
  getBmoniUserService: () => BmoniUserService;
  getWalletOwnershipRepository: () => WalletOwnershipRepository;
};

export const nigeriaOnboardingRoutes: FastifyPluginAsync<NigeriaOnboardingRouteOptions> = async (app, options) => {
  const ownership = options.getWalletOwnershipRepository();

  // Step 1: BVN match + PATCH /kyc. This route deliberately does NOT start the rail.
  app.post<{ Body: unknown }>("/start", async (request, reply) => {
    const parsed = nigeriaBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ statusCode: 400, error: "Bad Request", message: "Enter the documented sandbox identity, E.164 phone, 11-digit BVN, and complete Nigerian address including 6-digit postal code." });
    }

    const mapping = await options.getBmoniUserService().getMapping(parsed.data.localUserId);
    if (!mapping) return reply.status(409).send({ statusCode: 409, error: "Conflict", message: "Create the BMONI sandbox user before Nigeria onboarding." });
    const wallet = await ownership.findByLocalUserId(parsed.data.localUserId);
    if (!wallet) return reply.status(409).send({ statusCode: 409, error: "Conflict", message: "Create the CNGN smart wallet before Nigeria onboarding." });

    try {
      const gateway = options.getBmoniGateway();
      const existingStatus = await gateway.getOnboardingStatus(mapping.bmoniUserId);
      if (deriveNigeriaStatus(existingStatus) === "ready") {
        return reply.send({ environment: "sandbox", status: "ready", providerStatus: existingStatus });
      }

      const identity = await gateway.lookupBvn(mapping.bmoniUserId, parsed.data.bvn);
      const namesMatch = identity.firstName.trim().toLowerCase() === parsed.data.firstName.toLowerCase() && identity.lastName.trim().toLowerCase() === parsed.data.lastName.toLowerCase();
      const phoneMatches = !identity.phoneNumber || identity.phoneNumber === parsed.data.phoneNumber;
      if (!namesMatch || !phoneMatches) {
        return reply.status(422).send({ statusCode: 422, error: "Identity Mismatch", message: "The submitted identity does not match the BMONI sandbox BVN persona." });
      }

      await gateway.updateNigeriaKyc(mapping.bmoniUserId, {
        personalInfo: {
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          phoneNumber: parsed.data.phoneNumber,
          dateOfBirth: identity.dateOfBirth,
          gender: identity.gender
        },
        address: parsed.data.address,
        identificationNumbers: [{ type: "bvn", number: parsed.data.bvn, issuingCountryCode: "NGA" }]
      });

      return reply.status(202).send({
        environment: "sandbox",
        identity: { firstName: identity.firstName, lastName: identity.lastName },
        status: "documents_required",
        next: "Upload identification and proof-of-address documents before KYC activation."
      });
    } catch (error) {
      return handleBmoniError(app, reply, error, "Nigeria KYC profile");
    }
  });

  // Step 2: identification upload -> proof-of-address upload.
  app.post("/documents", async (request, reply) => {
    if (!request.isMultipart()) return reply.status(415).send({ message: "KYC documents must use multipart/form-data." });

    const fields = new Map<string, string>();
    const files = new Map<string, BmoniUploadFile>();
    try {
      for await (const part of request.parts()) {
        if (part.type === "file") {
          if (!allowedImageTypes.has(part.mimetype)) {
            part.file.resume();
            return reply.status(415).send({ message: "KYC document files must be JPEG or PNG images." });
          }
          const bytes = await part.toBuffer();
          files.set(part.fieldname, { bytes, filename: part.filename || `${part.fieldname}.jpg`, contentType: part.mimetype });
        } else {
          fields.set(part.fieldname, String(part.value));
        }
      }
    } catch (error) {
      app.log.warn({ errorName: error instanceof Error ? error.name : "Unknown" }, "KYC multipart parsing failed");
      return reply.status(400).send({ message: "KYC document upload could not be parsed within the configured limits." });
    }

    const localUserId = fields.get("localUserId");
    const idType = fields.get("idType");
    const documentNumber = fields.get("documentNumber");
    const issuingCountry = fields.get("issuingCountry");
    const proofAddressType = fields.get("proofAddressType");
    if (!localUserIdSchema.safeParse(localUserId).success || !idType || !identificationTypes.has(idType) || !documentNumber?.trim() || issuingCountry !== "NGA" || !proofAddressType || !proofTypes.has(proofAddressType)) {
      return reply.status(400).send({ message: "Valid localUserId, supported ID type, document number, NGA issuing country, and proof-of-address type are required." });
    }
    const idFront = files.get("idFront");
    const poaFront = files.get("poaFront");
    if (!idFront || !poaFront) return reply.status(400).send({ message: "ID front and proof-of-address front images are required." });

    const mapping = await options.getBmoniUserService().getMapping(localUserId!);
    if (!mapping) return reply.status(409).send({ message: "Create the BMONI user before uploading KYC documents." });

    try {
      const gateway = options.getBmoniGateway();
      const idFiles = [idFront, files.get("idBack")].filter((file): file is BmoniUploadFile => Boolean(file));
      const poaFiles = [poaFront, files.get("poaBack")].filter((file): file is BmoniUploadFile => Boolean(file));
      await gateway.uploadKycIdentification(mapping.bmoniUserId, {
        files: idFiles,
        type: idType!,
        documentNumber: documentNumber!.trim(),
        issuingCountry: "NGA",
        expirationDate: nonEmpty(fields.get("expirationDate")),
        issueDate: nonEmpty(fields.get("issueDate"))
      });
      await gateway.uploadKycProofOfAddress(mapping.bmoniUserId, { files: poaFiles, type: proofAddressType! });
      return reply.status(202).send({ status: "documents_uploaded", next: "Run KYC readiness and activation." });
    } catch (error) {
      return handleBmoniError(app, reply, error, "Nigeria KYC document upload");
    }
  });

  // Step 3: readiness -> activate (empty body for NGN) -> start-nigeria rail.
  app.post<{ Body: unknown }>("/activate", async (request, reply) => {
    const parsed = activateBodySchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ message: "Valid localUserId and 11-digit sandbox BVN are required." });
    const mapping = await options.getBmoniUserService().getMapping(parsed.data.localUserId);
    if (!mapping) return reply.status(409).send({ message: "Create the BMONI user before KYC activation." });
    const wallet = await ownership.findByLocalUserId(parsed.data.localUserId);
    if (!wallet) return reply.status(409).send({ message: "Create the CNGN smart wallet before KYC activation." });

    try {
      const gateway = options.getBmoniGateway();
      const readiness = await gateway.getKycReadiness(mapping.bmoniUserId);
      await gateway.activateKyc(mapping.bmoniUserId);
      await gateway.startNigeriaOnboarding(mapping.bmoniUserId, {
        bvn: parsed.data.bvn,
        ngnWalletAddress: wallet.smartWalletAddress,
        ngnWalletIndex: 0
      });
      const providerStatus = await gateway.getOnboardingStatus(mapping.bmoniUserId);
      return reply.status(202).send({
        environment: "sandbox",
        status: deriveNigeriaStatus(providerStatus),
        readiness,
        providerStatus
      });
    } catch (error) {
      return handleBmoniError(app, reply, error, "Nigeria KYC activation and rail start");
    }
  });

  app.get<{ Querystring: { localUserId?: string } }>("/status", async (request, reply) => {
    const parsed = localUserIdSchema.safeParse(request.query.localUserId);
    if (!parsed.success) return reply.status(400).send({ statusCode: 400, error: "Bad Request", message: "localUserId must be a UUID." });
    const mapping = await options.getBmoniUserService().getMapping(parsed.data);
    if (!mapping) return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "No BMONI user mapping exists for this user." });
    try {
      const providerStatus = await options.getBmoniGateway().getOnboardingStatus(mapping.bmoniUserId);
      return { environment: "sandbox", status: deriveNigeriaStatus(providerStatus), providerStatus };
    } catch (error) {
      return handleBmoniError(app, reply, error, "Nigeria onboarding status");
    }
  });
};

function deriveNigeriaStatus(providerStatus: Record<string, unknown>) {
  const serialized = JSON.stringify(providerStatus).toLowerCase();
  if (/\b(active|completed|ready)\b/.test(serialized)) return "ready" as const;
  if (/\b(failed|rejected|error)\b/.test(serialized)) return "failed" as const;
  if (/\b(action_required|action required|documents|required)\b/.test(serialized)) return "action_required" as const;
  return "processing" as const;
}

function nonEmpty(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function handleBmoniError(app: FastifyInstance, reply: FastifyReply, error: unknown, operation: string) {
  if (error instanceof BmoniConfigurationError) return reply.status(503).send({ statusCode: 503, error: "Service Unavailable", message: "BMONI sandbox access is not configured." });
  if (error instanceof BmoniProviderError) {
    app.log.warn({ errorName: error.name, requestId: error.requestId, statusCode: error.statusCode }, `BMONI ${operation} failed`);
    const statusCode = error.statusCode === 400 || error.statusCode === 409 || error.statusCode === 422 ? error.statusCode : 502;
    return reply.status(statusCode).send({ statusCode, error: "Upstream Error", message: `BMONI rejected the ${operation}.`, requestId: error.requestId });
  }
  if (error instanceof BmoniTransportError) return reply.status(503).send({ statusCode: 503, error: "Service Unavailable", message: "BMONI could not be reached." });
  if (error instanceof BmoniResponseValidationError) return reply.status(502).send({ statusCode: 502, error: "Bad Gateway", message: "BMONI returned an undocumented Nigeria onboarding response." });
  throw error;
}
