import type { DocumentPickerAsset } from "expo-document-picker";

const apiUrl = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

export type NigeriaOnboardingStatus =
  | "idle"
  | "documents_required"
  | "documents_uploaded"
  | "processing"
  | "ready"
  | "action_required"
  | "failed";

export type KycVolumeRange = { label: string; value: number };
export type NigeriaKycOptions = {
  genders: string[];
  employmentStatuses: string[];
  fundsSources: string[];
  accountPurposes: string[];
  estimatedMonthlyVolumeRanges: KycVolumeRange[];
  identificationTypes: string[];
};
export type NigeriaOccupation = {
  id?: string;
  socCode?: string;
  displayName?: string;
  [key: string]: unknown;
};

export async function getNigeriaKycOptions(localUserId: string): Promise<NigeriaKycOptions> {
  const response = await fetch(`${apiUrl}/api/onboarding/nigeria/options?localUserId=${encodeURIComponent(localUserId)}`);
  const payload = (await response.json()) as { options?: unknown; message?: string };
  if (!response.ok) throw new Error(payload.message ?? "BMONI KYC options could not be loaded.");
  return normalizeOptions(payload.options);
}

export async function searchNigeriaOccupations(localUserId: string, search: string): Promise<NigeriaOccupation[]> {
  const response = await fetch(
    `${apiUrl}/api/onboarding/nigeria/occupations?localUserId=${encodeURIComponent(localUserId)}&search=${encodeURIComponent(search.trim())}`
  );
  const payload = (await response.json()) as { occupations?: unknown; message?: string };
  if (!response.ok) throw new Error(payload.message ?? "BMONI occupation search failed.");
  return normalizeOccupations(payload.occupations);
}

export async function prepareNigeriaKyc(input: {
  localUserId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: string;
  streetLine1: string;
  streetLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  occupationCode: string;
  employerName: string;
  employmentStatus: string;
  sourceOfFunds: string;
  estimatedMonthlyVolume: number;
  accountPurpose: string;
  actingAsIntermediary: boolean;
  bvn: string;
}): Promise<NigeriaOnboardingStatus> {
  const response = await fetch(`${apiUrl}/api/onboarding/nigeria/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      localUserId: input.localUserId,
      personalInfo: {
        firstName: input.firstName,
        lastName: input.lastName,
        ...(input.middleName?.trim() ? { middleName: input.middleName.trim() } : {}),
        phoneNumber: input.phoneNumber,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender
      },
      address: {
        streetLine1: input.streetLine1,
        ...(input.streetLine2?.trim() ? { streetLine2: input.streetLine2.trim() } : {}),
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        countryCode: "NGA"
      },
      employment: {
        occupationCode: input.occupationCode,
        employerName: input.employerName,
        employmentStatus: input.employmentStatus
      },
      sourceOfFunds: input.sourceOfFunds,
      estimatedMonthlyVolume: input.estimatedMonthlyVolume,
      accountPurpose: input.accountPurpose,
      actingAsIntermediary: input.actingAsIntermediary,
      identificationNumbers: [{ type: "bvn", number: input.bvn, issuingCountryCode: "NGA" }]
    })
  });
  const payload = (await response.json()) as { status?: NigeriaOnboardingStatus; message?: string };
  if (!response.ok) throw new Error(payload.message ?? "Nigeria KYC profile could not be prepared.");
  return payload.status ?? "documents_required";
}

export async function uploadNigeriaKycDocuments(input: {
  localUserId: string;
  idType: "passport" | "drivers_license" | "national_id" | "government_id" | "other";
  documentNumber: string;
  issuingCountry: "NGA";
  proofAddressType: "utility_bill" | "bank_statement" | "rental_agreement" | "tax_document" | "other";
  idFront: DocumentPickerAsset;
  idBack?: DocumentPickerAsset | null;
  poaFront: DocumentPickerAsset;
  poaBack?: DocumentPickerAsset | null;
  expirationDate: string;
  issueDate?: string;
}): Promise<NigeriaOnboardingStatus> {
  const form = new FormData();
  form.append("localUserId", input.localUserId);
  form.append("idType", input.idType);
  form.append("documentNumber", input.documentNumber);
  form.append("issuingCountry", input.issuingCountry);
  form.append("proofAddressType", input.proofAddressType);
  form.append("expirationDate", input.expirationDate.trim());
  if (input.issueDate?.trim()) form.append("issueDate", input.issueDate.trim());
  appendAsset(form, "idFront", input.idFront);
  if (input.idBack) appendAsset(form, "idBack", input.idBack);
  appendAsset(form, "poaFront", input.poaFront);
  if (input.poaBack) appendAsset(form, "poaBack", input.poaBack);

  const response = await fetch(`${apiUrl}/api/onboarding/nigeria/documents`, { method: "POST", body: form });
  const payload = (await response.json()) as { status?: NigeriaOnboardingStatus; message?: string };
  if (!response.ok) throw new Error(payload.message ?? "Nigeria KYC documents could not be uploaded.");
  return payload.status ?? "documents_uploaded";
}

export async function activateNigeriaRail(localUserId: string, bvn: string): Promise<NigeriaOnboardingStatus> {
  const response = await fetch(`${apiUrl}/api/onboarding/nigeria/activate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ localUserId, bvn })
  });
  const payload = (await response.json()) as { status?: NigeriaOnboardingStatus; message?: string };
  if (!response.ok) throw new Error(payload.message ?? "Nigeria KYC activation or rail start failed.");
  return payload.status ?? "processing";
}

export async function getNigeriaRailStatus(localUserId: string): Promise<NigeriaOnboardingStatus> {
  const response = await fetch(`${apiUrl}/api/onboarding/nigeria/status?localUserId=${encodeURIComponent(localUserId)}`);
  const payload = (await response.json()) as { status?: NigeriaOnboardingStatus; message?: string };
  if (!response.ok) throw new Error(payload.message ?? "Nigeria rail status could not be checked.");
  return payload.status ?? "processing";
}

export async function ensureNgnDepositAccount(localUserId: string) {
  const response = await fetch(`${apiUrl}/api/wallet/deposit-account`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ localUserId })
  });
  const payload = (await response.json()) as { status?: "created" | "existing"; depositAccount?: unknown; message?: string };
  if (!response.ok) throw new Error(payload.message ?? "NGN virtual account could not be created.");
  return payload;
}

function normalizeOptions(value: unknown): NigeriaKycOptions {
  const record = asRecord(value);
  if (!record) throw new Error("BMONI returned an undocumented KYC-options response.");
  const volumes = Array.isArray(record.estimatedMonthlyVolumeRanges)
    ? record.estimatedMonthlyVolumeRanges.flatMap((item) => {
        const row = asRecord(item);
        return row && typeof row.value === "number"
          ? [{ label: typeof row.label === "string" ? row.label : String(row.value), value: Math.round(row.value) }]
          : [];
      })
    : [];
  const result = {
    genders: strings(record.genders),
    employmentStatuses: strings(record.employmentStatuses),
    fundsSources: strings(record.fundsSources),
    accountPurposes: strings(record.accountPurposes),
    estimatedMonthlyVolumeRanges: volumes,
    identificationTypes: strings(record.identificationTypes)
  };
  if (
    result.genders.length === 0 ||
    result.employmentStatuses.length === 0 ||
    result.fundsSources.length === 0 ||
    result.accountPurposes.length === 0 ||
    result.estimatedMonthlyVolumeRanges.length === 0
  ) {
    throw new Error("BMONI KYC options are incomplete. MONIFlow will not invent compliance values.");
  }
  return result;
}

function normalizeOccupations(value: unknown): NigeriaOccupation[] {
  const record = asRecord(value);
  const source: unknown[] = Array.isArray(value)
    ? value
    : record && Array.isArray(record.occupations)
      ? record.occupations
      : [];
  return source.filter((item): item is NigeriaOccupation => Boolean(asRecord(item)));
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}
function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function appendAsset(form: FormData, field: string, asset: DocumentPickerAsset) {
  const upload = {
    uri: asset.uri,
    name: asset.name || `${field}.jpg`,
    type: asset.mimeType || "image/jpeg"
  } as unknown as Blob;
  form.append(field, upload);
}
