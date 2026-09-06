import * as DocumentPicker from "expo-document-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton, Screen, SoftCard, StatusPill } from "@/components/ui";
import {
  activateNigeriaRail,
  ensureNgnDepositAccount,
  getNigeriaKycOptions,
  getNigeriaRailStatus,
  prepareNigeriaKyc,
  searchNigeriaOccupations,
  uploadNigeriaKycDocuments,
  type KycVolumeRange,
  type NigeriaKycOptions,
  type NigeriaOccupation,
  type NigeriaOnboardingStatus
} from "@/services/nigeria-onboarding";
import { colors, radius, spacing, typography } from "@/theme";

const configuredLocalUserId = process.env.EXPO_PUBLIC_DEV_LOCAL_USER_ID ?? "";
type Asset = DocumentPicker.DocumentPickerAsset;
type IdType = "passport" | "drivers_license" | "national_id" | "government_id" | "other";
type PoaType = "utility_bill" | "bank_statement" | "rental_agreement" | "tax_document" | "other";
const supportedIdTypes: readonly IdType[] = ["passport", "drivers_license", "national_id", "government_id", "other"];
const poaTypes: readonly PoaType[] = ["utility_bill", "bank_statement", "rental_agreement", "tax_document", "other"];

export default function CompleteNigeriaOnboardingScreen() {
  const params = useLocalSearchParams<{ localUserId?: string | string[] }>();
  const routed = Array.isArray(params.localUserId) ? params.localUserId[0] : params.localUserId;
  const localUserId = routed?.trim() || configuredLocalUserId;

  const [firstName, setFirstName] = useState("Chiamaka");
  const [lastName, setLastName] = useState("Okafor");
  const [phoneNumber, setPhoneNumber] = useState("+2348012345678");
  const [dateOfBirth, setDateOfBirth] = useState("1990-01-01");
  const [gender, setGender] = useState<string | null>(null);
  const [bvn, setBvn] = useState("22222222222");
  const [streetLine1, setStreetLine1] = useState("15 Admiralty Way");
  const [city, setCity] = useState("Lagos");
  const [stateName, setStateName] = useState("Lagos");
  const [postalCode, setPostalCode] = useState("101241");

  const [options, setOptions] = useState<NigeriaKycOptions | null>(null);
  const [occupationSearch, setOccupationSearch] = useState("engineer");
  const [occupationHits, setOccupationHits] = useState<NigeriaOccupation[]>([]);
  const [occupationCode, setOccupationCode] = useState<string | null>(null);
  const [occupationLabel, setOccupationLabel] = useState<string | null>(null);
  const [employerName, setEmployerName] = useState("ACME Corp");
  const [employmentStatus, setEmploymentStatus] = useState<string | null>(null);
  const [sourceOfFunds, setSourceOfFunds] = useState<string | null>(null);
  const [accountPurpose, setAccountPurpose] = useState<string | null>(null);
  const [monthlyVolume, setMonthlyVolume] = useState<KycVolumeRange | null>(null);
  const [actingAsIntermediary, setActingAsIntermediary] = useState(false);

  const [idType, setIdType] = useState<IdType>("passport");
  const [documentNumber, setDocumentNumber] = useState("A12345678");
  const [expirationDate, setExpirationDate] = useState("2030-01-01");
  const [issueDate, setIssueDate] = useState("2020-01-01");
  const [proofAddressType, setProofAddressType] = useState<PoaType>("utility_bill");
  const [idFront, setIdFront] = useState<Asset | null>(null);
  const [poaFront, setPoaFront] = useState<Asset | null>(null);

  const [status, setStatus] = useState<NigeriaOnboardingStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!localUserId) return;
    let active = true;
    const load = async () => {
      setBusy(true);
      setMessage(null);
      try {
        const loaded = await getNigeriaKycOptions(localUserId);
        if (!active) return;
        setOptions(loaded);
        setGender(loaded.genders[0] ?? null);
        setEmploymentStatus(loaded.employmentStatuses[0] ?? null);
        setSourceOfFunds(loaded.fundsSources[0] ?? null);
        setAccountPurpose(loaded.accountPurposes[0] ?? null);
        setMonthlyVolume(loaded.estimatedMonthlyVolumeRanges[0] ?? null);
        const firstSupported = loaded.identificationTypes.find((value): value is IdType => supportedIdTypes.includes(value as IdType));
        if (firstSupported) setIdType(firstSupported);
      } catch (cause) {
        if (active) setMessage(cause instanceof Error ? cause.message : "BMONI KYC options could not be loaded.");
      } finally {
        if (active) setBusy(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [localUserId]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
    } catch (cause) {
      setStatus("failed");
      setMessage(cause instanceof Error ? cause.message : "Nigeria onboarding failed safely.");
    } finally {
      setBusy(false);
    }
  };

  const pick = async (setter: (asset: Asset) => void) => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false, type: ["image/jpeg", "image/png"] });
    if (!result.canceled && result.assets[0]) setter(result.assets[0]);
  };

  const searchOccupations = () => run(async () => {
    if (!localUserId) throw new Error("Your MONIFlow identity link is missing.");
    const hits = await searchNigeriaOccupations(localUserId, occupationSearch);
    setOccupationHits(hits);
    if (hits.length === 0) setMessage("BMONI returned no occupations for that search.");
  });

  const prepareProfile = () => run(async () => {
    if (!localUserId) throw new Error("Your MONIFlow identity link is missing.");
    if (!options || !gender || !employmentStatus || !sourceOfFunds || !accountPurpose || !monthlyVolume) {
      throw new Error("Load and select the BMONI KYC options before submitting the profile.");
    }
    if (!occupationCode) throw new Error("Search BMONI occupations and select an occupation before submitting.");
    const next = await prepareNigeriaKyc({
      localUserId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber: phoneNumber.trim(),
      dateOfBirth: dateOfBirth.trim(),
      gender,
      streetLine1: streetLine1.trim(),
      city: city.trim(),
      state: stateName.trim(),
      postalCode: postalCode.trim(),
      occupationCode,
      employerName: employerName.trim(),
      employmentStatus,
      sourceOfFunds,
      estimatedMonthlyVolume: monthlyVolume.value,
      accountPurpose,
      actingAsIntermediary,
      bvn: bvn.trim()
    });
    setStatus(next);
    setMessage("BMONI accepted the KYC profile. Upload the required sandbox documents next.");
  });

  const uploadDocuments = () => run(async () => {
    if (!localUserId || !idFront || !poaFront) throw new Error("Select an ID-front image and proof-of-address image first.");
    const next = await uploadNigeriaKycDocuments({
      localUserId,
      idType,
      documentNumber: documentNumber.trim(),
      issuingCountry: "NGA",
      proofAddressType,
      idFront,
      poaFront,
      expirationDate: expirationDate.trim(),
      issueDate: issueDate.trim()
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

  const providerIdTypes = (options?.identificationTypes ?? []).filter((value): value is IdType => supportedIdTypes.includes(value as IdType));

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>NIGERIA · NGN · BMONI SANDBOX</Text>
        <Text style={styles.title}>Activate the real sandbox rail in BMONI's required order.</Text>
        <Text style={styles.subtitle}>Use only BMONI sandbox values and permitted sandbox document images. Never enter or upload your real BVN, NIN, passport, or proof of address here.</Text>
      </View>

      <SoftCard style={styles.card}>
        <View style={styles.environmentRow}>
          <Text style={styles.sectionLabel}>01 · KYC PROFILE</Text>
          <StatusPill label={options ? "PROVIDER OPTIONS LOADED" : "WAITING FOR BMONI"} tone={options ? "success" : "processing"} />
        </View>
        <View style={styles.row}><Field label="FIRST NAME" value={firstName} onChangeText={setFirstName} /><Field label="LAST NAME" value={lastName} onChangeText={setLastName} /></View>
        <Field label="PHONE · E.164" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
        <Field label="DATE OF BIRTH · YYYY-MM-DD" value={dateOfBirth} onChangeText={setDateOfBirth} />
        <ChoiceRow label="GENDER" values={options?.genders ?? []} selected={gender} onSelect={setGender} />
        <Field label="STREET" value={streetLine1} onChangeText={setStreetLine1} />
        <View style={styles.row}><Field label="CITY" value={city} onChangeText={setCity} /><Field label="STATE" value={stateName} onChangeText={setStateName} /></View>
        <Field label="POSTAL CODE" value={postalCode} onChangeText={(value) => setPostalCode(value.replace(/\D/g, ""))} keyboardType="number-pad" maxLength={6} />

        <Text style={styles.sectionLabel}>EMPLOYMENT</Text>
        <Field label="SEARCH OCCUPATION" value={occupationSearch} onChangeText={setOccupationSearch} />
        <PrimaryButton disabled={busy || !options} onPress={() => void searchOccupations()}>{busy ? "Searching…" : "Search BMONI occupations"}</PrimaryButton>
        {occupationLabel ? <Text style={styles.selected}>Selected · {occupationLabel} · {occupationCode}</Text> : null}
        {occupationHits.slice(0, 8).map((hit, index) => {
          const code = typeof hit.id === "string" ? hit.id : typeof hit.socCode === "string" ? hit.socCode : "";
          const label = typeof hit.displayName === "string" ? hit.displayName : typeof hit.socCode === "string" ? hit.socCode : "Occupation";
          return code ? <Choice key={`${code}-${index}`} label={`${label} · ${code}`} selected={occupationCode === code} onPress={() => { setOccupationCode(code); setOccupationLabel(label); }} /> : null;
        })}
        <Field label="EMPLOYER" value={employerName} onChangeText={setEmployerName} />
        <ChoiceRow label="EMPLOYMENT STATUS" values={options?.employmentStatuses ?? []} selected={employmentStatus} onSelect={setEmploymentStatus} />

        <Text style={styles.sectionLabel}>COMPLIANCE</Text>
        <ChoiceRow label="SOURCE OF FUNDS" values={options?.fundsSources ?? []} selected={sourceOfFunds} onSelect={setSourceOfFunds} />
        <ChoiceRow label="ACCOUNT PURPOSE" values={options?.accountPurposes ?? []} selected={accountPurpose} onSelect={setAccountPurpose} />
        <ChoiceRow
          label="EST. MONTHLY VOLUME · USD"
          values={(options?.estimatedMonthlyVolumeRanges ?? []).map((value) => value.label)}
          selected={monthlyVolume?.label ?? null}
          onSelect={(label) => setMonthlyVolume(options?.estimatedMonthlyVolumeRanges.find((value) => value.label === label) ?? null)}
        />
        <Pressable onPress={() => setActingAsIntermediary((value) => !value)} style={styles.toggle}>
          <Text style={styles.label}>ACTING AS INTERMEDIARY</Text>
          <Text style={styles.toggleValue}>{actingAsIntermediary ? "YES" : "NO"}</Text>
        </Pressable>
        <Field label="SANDBOX BVN" value={bvn} onChangeText={(value) => setBvn(value.replace(/\D/g, ""))} keyboardType="number-pad" secure maxLength={11} />
        <PrimaryButton disabled={busy || !options || !occupationCode} onPress={() => void prepareProfile()}>{busy ? "Submitting…" : "1. Save KYC profile"}</PrimaryButton>
      </SoftCard>

      <SoftCard style={styles.card}>
        <Text style={styles.sectionLabel}>02 · DOCUMENTS</Text>
        <ChoiceRow label="ID TYPE" values={providerIdTypes.length > 0 ? providerIdTypes : [...supportedIdTypes]} selected={idType} onSelect={(value) => setIdType(value as IdType)} />
        <Field label="SANDBOX DOCUMENT NUMBER" value={documentNumber} onChangeText={setDocumentNumber} />
        <Field label="EXPIRATION · YYYY-MM-DD" value={expirationDate} onChangeText={setExpirationDate} />
        <Field label="ISSUE DATE · YYYY-MM-DD" value={issueDate} onChangeText={setIssueDate} />
        <ChoiceRow label="PROOF OF ADDRESS TYPE" values={[...poaTypes]} selected={proofAddressType} onSelect={(value) => setProofAddressType(value as PoaType)} />
        <DocumentButton label="ID FRONT · JPEG/PNG" asset={idFront} onPress={() => void pick(setIdFront)} />
        <DocumentButton label="PROOF OF ADDRESS · JPEG/PNG" asset={poaFront} onPress={() => void pick(setPoaFront)} />
        <PrimaryButton disabled={busy || status !== "documents_required" || !idFront || !poaFront || !documentNumber.trim() || !expirationDate.trim()} onPress={() => void uploadDocuments()}>{busy ? "Uploading…" : "2. Upload KYC documents"}</PrimaryButton>
      </SoftCard>

      <SoftCard style={styles.card}>
        <Text style={styles.sectionLabel}>03 · READINESS → ACTIVATE → NIGERIA RAIL</Text>
        <Text style={styles.copy}>MONIFlow follows BMONI's fixed sequence: readiness, empty-body NGN activation, then start-nigeria with the persisted managed CNGN wallet address.</Text>
        <PrimaryButton disabled={busy || status !== "documents_uploaded" || bvn.length !== 11} onPress={() => void activate()}>{busy ? "Activating…" : "3. Activate KYC + Nigeria rail"}</PrimaryButton>
        {(status === "processing" || status === "action_required") ? <PrimaryButton disabled={busy} onPress={() => void refresh()}>{busy ? "Checking…" : "Check BMONI status"}</PrimaryButton> : null}
      </SoftCard>

      {status === "ready" ? (
        <SoftCard style={styles.readyCard}>
          <StatusPill label="NGN RAIL ACTIVE" tone="success" />
          <Text style={styles.readyTitle}>Create the real NGN funding account.</Text>
          <Text style={styles.copy}>MONIFlow checks for an existing BMONI NGN deposit account before creating one with the persisted smartWalletId.</Text>
          <PrimaryButton disabled={busy} onPress={() => void finish()}>{busy ? "Preparing…" : "4. Create NGN funding account"}</PrimaryButton>
        </SoftCard>
      ) : null}

      <StatusPill label={statusLabel(status)} tone={statusTone(status)} />
      {message ? <Text style={[styles.message, status === "failed" && styles.error]}>{message}</Text> : null}
      <Text style={styles.privacy}>BMONI provider state is authoritative. MONIFlow does not simulate KYC, balances, wallets, rail activation, or funding.</Text>
    </Screen>
  );
}

function ChoiceRow({ label, values, selected, onSelect }: { label: string; values: string[]; selected: string | null; onSelect: (value: string) => void }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><View style={styles.choiceRow}>{values.map((value) => <Choice key={value} label={value} selected={selected === value} onPress={() => onSelect(value)} />)}</View></View>;
}
function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.choice, selected && styles.choiceSelected]}><Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text></Pressable>;
}
function DocumentButton({ label, asset, onPress }: { label: string; asset: Asset | null; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.documentButton}><View style={styles.documentCopy}><Text style={styles.label}>{label}</Text><Text numberOfLines={1} style={styles.documentName}>{asset?.name ?? "Choose sandbox image"}</Text></View><Text style={styles.symbol}>{asset ? "✓" : "+"}</Text></Pressable>;
}
function Field({ label, value, onChangeText, keyboardType, secure, maxLength }: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: "default" | "phone-pad" | "number-pad"; secure?: boolean; maxLength?: number }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput autoCapitalize="none" autoCorrect={false} keyboardType={keyboardType} maxLength={maxLength} onChangeText={onChangeText} secureTextEntry={secure} style={styles.input} value={value} /></View>;
}
function statusLabel(status: NigeriaOnboardingStatus) {
  if (status === "ready") return "BMONI · ACTIVE";
  if (status === "documents_required") return "BMONI · DOCUMENTS REQUIRED";
  if (status === "documents_uploaded") return "BMONI · DOCUMENTS UPLOADED";
  if (status === "processing") return "BMONI · PROCESSING";
  if (status === "action_required") return "BMONI · ACTION REQUIRED";
  if (status === "failed") return "BMONI · FAILED";
  return "BMONI · SANDBOX";
}
function statusTone(status: NigeriaOnboardingStatus): "neutral" | "success" | "warning" | "processing" {
  if (status === "ready") return "success";
  if (status === "idle") return "neutral";
  if (status === "processing") return "processing";
  return "warning";
}
function statusMessage(status: NigeriaOnboardingStatus) {
  if (status === "ready") return "BMONI reports the Nigeria NGN rail as active.";
  if (status === "action_required") return "BMONI requires another provider action. MONIFlow will not mark the rail ready until BMONI does.";
  if (status === "failed") return "BMONI reported a failed Nigeria onboarding state.";
  return "KYC activation and Nigeria onboarding were submitted. Check BMONI until the rail becomes active.";
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
  environmentRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: spacing.sm, flexWrap: "wrap" },
  sectionLabel: { ...typography.technical, color: colors.textSecondary, letterSpacing: 1.1 },
  row: { flexDirection: "row", gap: spacing.sm },
  field: { flex: 1, gap: spacing.xs },
  label: { ...typography.technical, color: colors.textSecondary },
  input: { ...typography.body, minHeight: 52, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.backgroundPrimary, color: colors.textPrimary, paddingHorizontal: spacing.md },
  copy: { ...typography.caption, color: colors.textSecondary },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  choice: { borderColor: colors.borderSoft, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: colors.backgroundPrimary },
  choiceSelected: { borderColor: colors.textPrimary, backgroundColor: colors.backgroundSecondary },
  choiceText: { ...typography.caption, color: colors.textSecondary },
  choiceTextSelected: { color: colors.textPrimary },
  selected: { ...typography.caption, color: colors.statusSuccess },
  toggle: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 52, borderColor: colors.borderSoft, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing.md },
  toggleValue: { ...typography.technical, color: colors.textPrimary },
  documentButton: { alignItems: "center", borderColor: colors.borderSoft, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 64, paddingHorizontal: spacing.md },
  documentCopy: { flex: 1, gap: spacing.xxs },
  documentName: { ...typography.body, color: colors.textPrimary },
  symbol: { ...typography.body, color: colors.textPrimary },
  message: { ...typography.caption, color: colors.textSecondary, textAlign: "center" },
  error: { color: colors.statusError },
  privacy: { ...typography.caption, color: colors.textSecondary, textAlign: "center", paddingHorizontal: spacing.md }
});
