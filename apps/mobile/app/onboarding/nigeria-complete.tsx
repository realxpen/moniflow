import * as DocumentPicker from "expo-document-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton, Screen, SoftCard, StatusPill } from "@/components/ui";
import {
  activateNigeriaRail,
  ensureNgnDepositAccount,
  getNigeriaRailStatus,
  prepareNigeriaKyc,
  uploadNigeriaKycDocuments,
  type NigeriaOnboardingStatus
} from "@/services/nigeria-onboarding";
import { colors, radius, spacing, typography } from "@/theme";

const configuredLocalUserId = process.env.EXPO_PUBLIC_DEV_LOCAL_USER_ID ?? "";
type Asset = DocumentPicker.DocumentPickerAsset;

export default function CompleteNigeriaOnboardingScreen() {
  const params = useLocalSearchParams<{ localUserId?: string | string[] }>();
  const routed = Array.isArray(params.localUserId) ? params.localUserId[0] : params.localUserId;
  const localUserId = routed?.trim() || configuredLocalUserId;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bvn, setBvn] = useState("");
  const [streetLine1, setStreetLine1] = useState("");
  const [city, setCity] = useState("Lagos");
  const [stateName, setStateName] = useState("Lagos");
  const [postalCode, setPostalCode] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [idFront, setIdFront] = useState<Asset | null>(null);
  const [poaFront, setPoaFront] = useState<Asset | null>(null);
  const [status, setStatus] = useState<NigeriaOnboardingStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try { await action(); }
    catch (cause) {
      setStatus("failed");
      setMessage(cause instanceof Error ? cause.message : "Nigeria onboarding failed safely.");
    } finally { setBusy(false); }
  };

  const pick = async (setter: (asset: Asset) => void) => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ["image/jpeg", "image/png"]
    });
    if (!result.canceled && result.assets[0]) setter(result.assets[0]);
  };

  const prepareProfile = () => run(async () => {
    if (!localUserId) throw new Error("Your MONIFlow identity link is missing.");
    const next = await prepareNigeriaKyc({
      localUserId,
      firstName: firstName.trim(), lastName: lastName.trim(), phoneNumber: phoneNumber.trim(), bvn: bvn.trim(),
      streetLine1: streetLine1.trim(), city: city.trim(), state: stateName.trim(), postalCode: postalCode.trim()
    });
    setStatus(next);
    setMessage(next === "ready" ? "BMONI already reports this rail ready." : "Profile accepted. Upload the required KYC images next.");
  });

  const uploadDocuments = () => run(async () => {
    if (!localUserId || !idFront || !poaFront) throw new Error("Select an ID-front image and proof-of-address image first.");
    const next = await uploadNigeriaKycDocuments({
      localUserId,
      idType: "national_id",
      documentNumber: documentNumber.trim(),
      issuingCountry: "NGA",
      proofAddressType: "utility_bill",
      idFront,
      poaFront
    });
    setStatus(next);
    setMessage("BMONI received identification first and proof of address second.");
  });

  const activate = () => run(async () => {
    if (!localUserId) throw new Error("Your MONIFlow identity link is missing.");
    const next = await activateNigeriaRail(localUserId, bvn.trim());
    setStatus(next);
    setMessage(statusMessage(next));
  });

  const refresh = () => run(async () => {
    if (!localUserId) throw new Error("Your MONIFlow identity link is missing.");
    const next = await getNigeriaRailStatus(localUserId);
    setStatus(next);
    setMessage(statusMessage(next));
  });

  const finish = () => run(async () => {
    if (!localUserId) throw new Error("Your MONIFlow identity link is missing.");
    await ensureNgnDepositAccount(localUserId);
    router.push({ pathname: "/onboarding/success", params: { localUserId } });
  });

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>NIGERIA · NGN · BMONI SANDBOX</Text>
        <Text style={styles.title}>Activate the rail in the provider's required order.</Text>
        <Text style={styles.subtitle}>Use only a documented BMONI sandbox persona and permitted sandbox document images. Do not enter or upload your real identity in sandbox.</Text>
      </View>

      <SoftCard style={styles.card}>
        <View style={styles.environmentRow}>
          <Text style={styles.sectionLabel}>01 · KYC PROFILE</Text>
          <StatusPill label={statusLabel(status)} tone={statusTone(status)} />
        </View>
        <View style={styles.row}><Field label="FIRST NAME" value={firstName} onChangeText={setFirstName} /><Field label="LAST NAME" value={lastName} onChangeText={setLastName} /></View>
        <Field label="PHONE · E.164" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
        <Field label="SANDBOX BVN" value={bvn} onChangeText={(value) => setBvn(value.replace(/\D/g, ""))} keyboardType="number-pad" secure maxLength={11} />
        <Field label="STREET" value={streetLine1} onChangeText={setStreetLine1} />
        <View style={styles.row}><Field label="CITY" value={city} onChangeText={setCity} /><Field label="STATE" value={stateName} onChangeText={setStateName} /></View>
        <Field label="POSTAL CODE" value={postalCode} onChangeText={(value) => setPostalCode(value.replace(/\D/g, ""))} keyboardType="number-pad" maxLength={6} />
        <PrimaryButton disabled={busy || !localUserId} onPress={() => void prepareProfile()}>{busy ? "Submitting…" : "1. Save KYC profile"}</PrimaryButton>
      </SoftCard>

      <SoftCard style={styles.card}>
        <Text style={styles.sectionLabel}>02 · DOCUMENTS</Text>
        <Text style={styles.copy}>MONIFlow uses the BMONI `national_id` identification type and `utility_bill` proof-of-address type for this MVP screen. ID front and proof-of-address front are required; no biometric is uploaded for NGN.</Text>
        <Field label="SANDBOX NATIONAL ID NUMBER" value={documentNumber} onChangeText={(value) => setDocumentNumber(value.replace(/\D/g, ""))} keyboardType="number-pad" />
        <DocumentButton label="ID FRONT · JPEG/PNG" asset={idFront} onPress={() => void pick(setIdFront)} />
        <DocumentButton label="UTILITY BILL · JPEG/PNG" asset={poaFront} onPress={() => void pick(setPoaFront)} />
        <PrimaryButton disabled={busy || status !== "documents_required" || !idFront || !poaFront || !documentNumber.trim()} onPress={() => void uploadDocuments()}>{busy ? "Uploading…" : "2. Upload KYC documents"}</PrimaryButton>
      </SoftCard>

      <SoftCard style={styles.card}>
        <Text style={styles.sectionLabel}>03 · READINESS → ACTIVATE → RAIL</Text>
        <Text style={styles.copy}>The API checks KYC readiness, activates NGN KYC with an empty body, then starts Nigeria onboarding with the persisted CNGN smart-wallet address.</Text>
        <PrimaryButton disabled={busy || status !== "documents_uploaded" || bvn.length !== 11} onPress={() => void activate()}>{busy ? "Activating…" : "3. Activate KYC + Nigeria rail"}</PrimaryButton>
        {(status === "processing" || status === "action_required") ? <PrimaryButton disabled={busy} onPress={() => void refresh()}>{busy ? "Checking…" : "Check provider status"}</PrimaryButton> : null}
      </SoftCard>

      {status === "ready" ? (
        <SoftCard style={styles.readyCard}>
          <StatusPill label="NGN RAIL ACTIVE" tone="success" />
          <Text style={styles.readyTitle}>Create the funding account.</Text>
          <Text style={styles.copy}>MONIFlow first checks for an existing NGN deposit account; if absent it calls BMONI `/vba/ngn` with the persisted smartWalletId.</Text>
          <PrimaryButton disabled={busy} onPress={() => void finish()}>{busy ? "Preparing…" : "4. Create NGN funding account"}</PrimaryButton>
        </SoftCard>
      ) : null}

      {message ? <Text style={[styles.message, status === "failed" && styles.error]}>{message}</Text> : null}
      <Text style={styles.privacy}>BMONI provider state is authoritative. Test-token credit is provider-controlled and is never simulated by MONIFlow.</Text>
    </Screen>
  );
}

function DocumentButton({ label, asset, onPress }: { label: string; asset: Asset | null; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.documentButton}><View style={styles.documentCopy}><Text style={styles.label}>{label}</Text><Text numberOfLines={1} style={styles.documentName}>{asset?.name ?? "Choose image"}</Text></View><Text style={styles.symbol}>{asset ? "✓" : "+"}</Text></Pressable>;
}
function Field({ label, value, onChangeText, keyboardType, secure, maxLength }: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: "default" | "phone-pad" | "number-pad"; secure?: boolean; maxLength?: number }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput autoCapitalize="words" autoCorrect={false} keyboardType={keyboardType} maxLength={maxLength} onChangeText={onChangeText} secureTextEntry={secure} style={styles.input} value={value} /></View>;
}
function statusLabel(status: NigeriaOnboardingStatus) {
  if (status === "ready") return "ACTIVE";
  if (status === "documents_required") return "DOCUMENTS REQUIRED";
  if (status === "documents_uploaded") return "DOCUMENTS UPLOADED";
  if (status === "processing") return "PROCESSING";
  if (status === "action_required") return "ACTION REQUIRED";
  if (status === "failed") return "FAILED";
  return "SANDBOX";
}
function statusTone(status: NigeriaOnboardingStatus): "neutral" | "success" | "warning" {
  return status === "ready" ? "success" : status === "idle" ? "neutral" : "warning";
}
function statusMessage(status: NigeriaOnboardingStatus) {
  if (status === "ready") return "BMONI reports the Nigeria NGN rail as active.";
  if (status === "action_required") return "BMONI requires another provider action. MONIFlow will not mark the rail ready until BMONI does.";
  if (status === "failed") return "BMONI reported a failed Nigeria onboarding state.";
  return "KYC was activated and the Nigeria rail was submitted. Check BMONI until the rail becomes active.";
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingBottom: spacing.xxxl },
  heading: { gap: spacing.sm, paddingTop: spacing.xl },
  eyebrow: { ...typography.technical, color: colors.textSecondary, letterSpacing: 1.4 },
  title: { ...typography.display, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary },
  card: { gap: spacing.md },
  readyCard: { gap: spacing.md, backgroundColor: colors.backgroundSecondary },
  readyTitle: { ...typography.heading, color: colors.textPrimary },
  environmentRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sectionLabel: { ...typography.technical, color: colors.textSecondary, letterSpacing: 1.1 },
  row: { flexDirection: "row", gap: spacing.sm },
  field: { flex: 1, gap: spacing.xs },
  label: { ...typography.technical, color: colors.textSecondary },
  input: { ...typography.body, minHeight: 52, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.backgroundPrimary, color: colors.textPrimary, paddingHorizontal: spacing.md },
  copy: { ...typography.caption, color: colors.textSecondary },
  documentButton: { alignItems: "center", borderColor: colors.borderSoft, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 64, paddingHorizontal: spacing.md },
  documentCopy: { flex: 1, gap: spacing.xxs },
  documentName: { ...typography.body, color: colors.textPrimary },
  symbol: { ...typography.body, color: colors.textPrimary },
  message: { ...typography.caption, color: colors.textSecondary, textAlign: "center" },
  error: { color: colors.statusError },
  privacy: { ...typography.caption, color: colors.textSecondary, textAlign: "center", paddingHorizontal: spacing.md }
});
