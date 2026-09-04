import type { DocumentPickerAsset } from "expo-document-picker";

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export type NigeriaOnboardingStatus =
  | "idle"
  | "documents_required"
  | "documents_uploaded"
  | "processing"
  | "ready"
  | "action_required"
  | "failed";

export async function prepareNigeriaKyc(input: {
  localUserId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  bvn: string;
  streetLine1: string;
  city: string;
  state: string;
  postalCode: string;
}): Promise<NigeriaOnboardingStatus> {
  const response = await fetch(`${apiUrl}/api/onboarding/nigeria/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      localUserId: input.localUserId,
      firstName: input.firstName,
      lastName: input.lastName,
      phoneNumber: input.phoneNumber,
      bvn: input.bvn,
      address: {
        streetLine1: input.streetLine1,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        countryCode: "NGA"
      }
    })
  });
  const payload = (await response.json()) as { status?: NigeriaOnboardingStatus; message?: string };
  if (!response.ok) throw new Error(payload.message ?? "Nigeria KYC profile could not be prepared.");
  return payload.status ?? "documents_required";
}

export async function uploadNigeriaKycDocuments(input: {
  localUserId: string;
  idType: "passport" | "drivers_license" | "national_id";
  documentNumber: string;
  issuingCountry: "NGA";
  proofAddressType: "utility_bill" | "bank_statement" | "government_letter" | "tax_document" | "lease_agreement";
  idFront: DocumentPickerAsset;
  idBack?: DocumentPickerAsset | null;
  poaFront: DocumentPickerAsset;
  poaBack?: DocumentPickerAsset | null;
  expirationDate?: string;
  issueDate?: string;
}): Promise<NigeriaOnboardingStatus> {
  const form = new FormData();
  form.append("localUserId", input.localUserId);
  form.append("idType", input.idType);
  form.append("documentNumber", input.documentNumber);
  form.append("issuingCountry", input.issuingCountry);
  form.append("proofAddressType", input.proofAddressType);
  if (input.expirationDate?.trim()) form.append("expirationDate", input.expirationDate.trim());
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

function appendAsset(form: FormData, field: string, asset: DocumentPickerAsset) {
  const upload = {
    uri: asset.uri,
    name: asset.name || `${field}.jpg`,
    type: asset.mimeType || "image/jpeg"
  } as unknown as Blob;
  form.append(field, upload);
}
