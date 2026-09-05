import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const palette = {
  ink: "#19191B",
  muted: "#6F6B78",
  lavender: "#EEEAF6",
  lavenderStrong: "#DDD5EF",
  paper: "#F8F5F0",
  glass: "rgba(255,255,255,0.72)",
  line: "rgba(25,25,27,0.10)",
  green: "#4E715A",
  greenSoft: "#E7EFE8",
  amber: "#8B6A34"
};

const futureFeatures = [
  {
    eyebrow: "LIFEWALLET",
    title: "Give every part of your life its own money rules.",
    copy: "Create financial domains for food, transport, business, tax, savings, family and more — each with budgets, limits, goals and policies."
  },
  {
    eyebrow: "GHOSTPAY",
    title: "Create purpose-specific payment identities.",
    copy: "Generate temporary payment endpoints for a sale, job or specific purpose, with rules around amount, expiry, payment count and closure."
  },
  {
    eyebrow: "TRUSTDROP",
    title: "Build safer commerce workflows.",
    copy: "Coordinate protected buyer-and-seller transactions for freelance work, social commerce, rentals and used-item sales, subject to the required legal and infrastructure support."
  },
  {
    eyebrow: "FINANCIAL AGENTS",
    title: "Specialists for income, savings, bills, tax and business.",
    copy: "Policy-constrained financial modules that can prepare and coordinate work without receiving unrestricted authority over your money."
  },
  {
    eyebrow: "BUSINESS MONIFLOW",
    title: "From personal money operations to SME treasury.",
    copy: "Expand into invoices, supplier payments, team permissions, cash-flow intelligence, business rules and operational finance."
  }
];

const flowSteps = ["Intent", "Money Plan", "MONI Guard", "Human approval", "BMONI execution", "Verification"];

function Eyebrow({ children }: { children: string }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
      <Text style={styles.primaryButtonText}>{label}</Text>
      <Text style={styles.primaryButtonArrow}>↗</Text>
    </Pressable>
  );
}

function DemoCard() {
  return (
    <View style={styles.demoShell}>
      <View style={styles.demoHeader}>
        <Text style={styles.demoBrand}>MONIFlow</Text>
        <View style={styles.sandboxPill}>
          <View style={styles.statusDot} />
          <Text style={styles.sandboxText}>SANDBOX</Text>
        </View>
      </View>

      <Text style={styles.balanceLabel}>AVAILABLE</Text>
      <Text style={styles.balance}>₦300,000</Text>

      <View style={styles.operatorCard}>
        <Eyebrow>MONIFLOW OPERATOR</Eyebrow>
        <Text style={styles.operatorPrompt}>What should your money do?</Text>
        <View style={styles.commandBubble}>
          <Text style={styles.commandText}>Withdraw ₦40,000 to my GTBank account and save ₦20,000 for my laptop.</Text>
        </View>
      </View>

      <View style={styles.planCard}>
        <View style={styles.planTopRow}>
          <Eyebrow>YOUR MONEY PLAN</Eyebrow>
          <View style={styles.guardBadge}><Text style={styles.guardBadgeText}>GUARD ✓</Text></View>
        </View>
        <View style={styles.planRow}>
          <View><Text style={styles.planTitle}>GTBank</Text><Text style={styles.planMeta}>Bank withdrawal</Text></View>
          <Text style={styles.planAmount}>₦40,000</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.planRow}>
          <View><Text style={styles.planTitle}>Laptop</Text><Text style={styles.planMeta}>Internal allocation</Text></View>
          <Text style={styles.planAmount}>₦20,000</Text>
        </View>
        <View style={styles.planFooter}>
          <Text style={styles.planMeta}>AVAILABLE AFTER</Text>
          <Text style={styles.planAfter}>₦240,000</Text>
        </View>
      </View>
    </View>
  );
}

export default function LandingScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 880;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.nav}>
          <View style={styles.logoWrap}>
            <View style={styles.logoMark}><Text style={styles.logoMarkText}>M</Text></View>
            <Text style={styles.logo}>MONIFlow</Text>
          </View>
          <View style={styles.navRight}>
            {wide ? <Text style={styles.navText}>Intent → Plan → Guard → Approve</Text> : null}
            <Pressable onPress={() => router.push("/onboarding/welcome")} style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}>
              <Text style={styles.navButtonText}>Open MVP</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.hero, wide && styles.heroWide]}>
          <View style={[styles.heroCopy, wide && styles.heroCopyWide]}>
            <View style={styles.heroPill}><Text style={styles.heroPillText}>INTELLIGENT FINANCIAL OPERATING SYSTEM · NIGERIA FIRST</Text></View>
            <Text style={[styles.heroTitle, wide && styles.heroTitleWide]}>Tell your money what you want it to accomplish.</Text>
            <Text style={styles.heroBody}>
              MONIFlow turns natural-language financial intentions into structured Money Plans, validates them with MONI Guard, keeps consequential decisions under human control, and uses BMONI Embedded for supported financial infrastructure.
            </Text>
            <View style={styles.heroActions}>
              <PrimaryButton label="Explore the MVP" onPress={() => router.push("/onboarding/welcome")} />
              <Text style={styles.heroNote}>MVP development · BMONI sandbox</Text>
            </View>
          </View>
          <View style={[styles.heroVisual, wide && styles.heroVisualWide]}>
            <View style={styles.glowOne} />
            <View style={styles.glowTwo} />
            <DemoCard />
          </View>
        </View>

        <View style={styles.statementSection}>
          <Eyebrow>THE SHIFT</Eyebrow>
          <Text style={[styles.sectionHeadline, wide && styles.sectionHeadlineWide]}>
            Financial software makes you learn its menus. MONIFlow learns the outcome you want.
          </Text>
          <Text style={styles.sectionBody}>
            Instead of opening transfer, savings and account screens one by one, you can express the objective once. MONIFlow translates that request into a visible workflow before anything consequential can happen.
          </Text>
        </View>

        <View style={[styles.flowGrid, wide && styles.flowGridWide]}>
          {flowSteps.map((step, index) => (
            <View key={step} style={[styles.flowStep, wide && styles.flowStepWide]}>
              <Text style={styles.flowIndex}>{String(index + 1).padStart(2, "0")}</Text>
              <Text style={styles.flowLabel}>{step}</Text>
              {index < flowSteps.length - 1 ? <Text style={styles.flowArrow}>→</Text> : null}
            </View>
          ))}
        </View>

        <View style={[styles.mvpSection, wide && styles.mvpSectionWide]}>
          <View style={styles.mvpIntro}>
            <Eyebrow>HACKATHON MVP</Eyebrow>
            <Text style={styles.sectionHeadline}>One command. A complete, controlled financial workflow.</Text>
            <Text style={styles.sectionBody}>
              The MVP is deliberately narrow: prove that a multi-step money instruction can become a correct plan, pass deterministic safety checks, require explicit approval, and reach a verifiable BMONI-backed state.
            </Text>
          </View>

          <View style={styles.mvpCard}>
            <Text style={styles.quote}>“Withdraw ₦40,000 to my GTBank account and save ₦20,000 for my laptop.”</Text>
            <View style={styles.mvpFeatureGrid}>
              <View style={styles.mvpFeature}><Eyebrow>01 · UNDERSTAND</Eyebrow><Text style={styles.mvpFeatureTitle}>Intent Engine</Text><Text style={styles.mvpFeatureCopy}>Structures supported financial requests without letting free-form AI directly execute money movement.</Text></View>
              <View style={styles.mvpFeature}><Eyebrow>02 · EXPLAIN</Eyebrow><Text style={styles.mvpFeatureTitle}>Money Plan</Text><Text style={styles.mvpFeatureCopy}>Shows actions, destinations, amounts, external movement, internal allocations and the expected balance after the plan.</Text></View>
              <View style={styles.mvpFeature}><Eyebrow>03 · PROTECT</Eyebrow><Text style={styles.mvpFeatureTitle}>MONI Guard</Text><Text style={styles.mvpFeatureCopy}>Runs deterministic balance, destination, integrity and authorization checks before execution can proceed.</Text></View>
              <View style={styles.mvpFeature}><Eyebrow>04 · AUTHORIZE</Eyebrow><Text style={styles.mvpFeatureTitle}>Human approval</Text><Text style={styles.mvpFeatureCopy}>Consequential external movement cannot proceed until the person sees the consequence and explicitly approves it.</Text></View>
            </View>
          </View>
        </View>

        <View style={styles.guardSection}>
          <View style={styles.guardPanel}>
            <View style={styles.guardTitleRow}>
              <View>
                <Eyebrow>MONI GUARD</Eyebrow>
                <Text style={styles.guardTitle}>Intelligence does not equal authority.</Text>
              </View>
              <View style={styles.safeBadge}><Text style={styles.safeBadgeText}>SAFE TO CONTINUE</Text></View>
            </View>
            {["Intent supported", "Balance sufficient", "Destination verified", "Requested amount preserved", "Plan totals verified", "Human authorization required"].map((check) => (
              <View key={check} style={styles.checkRow}>
                <View style={styles.checkIcon}><Text style={styles.checkIconText}>✓</Text></View>
                <Text style={styles.checkText}>{check}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.infrastructureSection}>
          <Eyebrow>UNDER THE HOOD</Eyebrow>
          <Text style={[styles.sectionHeadline, wide && styles.sectionHeadlineWide]}>BMONI provides the financial rails. MONIFlow provides the operating layer.</Text>
          <Text style={styles.sectionBody}>
            The architecture keeps responsibilities separate: intent understanding and planning live above the financial infrastructure, MONI Guard enforces policy, authorization remains with the human, and provider success is never claimed without provider evidence.
          </Text>
          <View style={[styles.architectureRow, wide && styles.architectureRowWide]}>
            {["USER INTENT", "MONIFLOW", "MONI GUARD", "YOU APPROVE", "BMONI", "VERIFIED RESULT"].map((item, index) => (
              <View key={item} style={styles.architectureItem}>
                <Text style={styles.architectureIndex}>{index + 1}</Text>
                <Text style={styles.architectureText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.futureSection}>
          <View style={styles.futureHeader}>
            <View style={styles.futureHeaderCopy}>
              <Eyebrow>BEYOND THE MVP</Eyebrow>
              <Text style={[styles.sectionHeadline, wide && styles.sectionHeadlineWide]}>The destination is a programmable financial operating system.</Text>
            </View>
            <Text style={styles.futureNote}>These are roadmap concepts, not claims about the current hackathon build.</Text>
          </View>

          <View style={[styles.futureGrid, wide && styles.futureGridWide]}>
            {futureFeatures.map((feature, index) => (
              <View key={feature.eyebrow} style={[styles.futureCard, index === 0 && styles.futureCardFeatured]}>
                <Eyebrow>{feature.eyebrow}</Eyebrow>
                <Text style={styles.futureTitle}>{feature.title}</Text>
                <Text style={styles.futureCopy}>{feature.copy}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.visionSection}>
          <Text style={styles.visionKicker}>THE LONG-TERM VISION</Text>
          <Text style={[styles.visionTitle, wide && styles.visionTitleWide]}>
            A future where people do not operate financial software — they express financial intentions, define their rules, and MONIFlow safely orchestrates what comes next.
          </Text>
          <View style={styles.visionFooter}>
            <Text style={styles.visionPrinciple}>More capability should create more transparency, stronger policy enforcement and better human control — not less.</Text>
            <PrimaryButton label="Enter MONIFlow" onPress={() => router.push("/onboarding/welcome")} />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>MONIFlow</Text>
          <Text style={styles.footerCopy}>Money, operated intelligently.</Text>
          <Text style={styles.footerMeta}>Hackathon MVP · Nigeria-first · BMONI Sandbox</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.paper },
  page: { backgroundColor: palette.paper, paddingBottom: 24 },
  nav: { width: "100%", maxWidth: 1240, alignSelf: "center", paddingHorizontal: 24, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  logoWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoMark: { width: 30, height: 30, borderRadius: 10, backgroundColor: palette.ink, alignItems: "center", justifyContent: "center" },
  logoMarkText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  logo: { color: palette.ink, fontSize: 19, fontWeight: "700", letterSpacing: -0.5 },
  navRight: { flexDirection: "row", gap: 18, alignItems: "center" },
  navText: { color: palette.muted, fontSize: 12, letterSpacing: 0.2 },
  navButton: { paddingHorizontal: 17, paddingVertical: 11, borderRadius: 999, backgroundColor: palette.ink },
  navButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  hero: { width: "100%", maxWidth: 1240, alignSelf: "center", paddingHorizontal: 24, paddingTop: 54, paddingBottom: 82, gap: 48 },
  heroWide: { flexDirection: "row", alignItems: "center", minHeight: 700 },
  heroCopy: { flex: 1, zIndex: 2 },
  heroCopyWide: { paddingRight: 28 },
  heroPill: { alignSelf: "flex-start", backgroundColor: palette.lavender, borderWidth: 1, borderColor: palette.lavenderStrong, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 24 },
  heroPillText: { fontSize: 10, fontWeight: "700", color: palette.muted, letterSpacing: 0.8 },
  heroTitle: { color: palette.ink, fontSize: 48, lineHeight: 50, fontWeight: "700", letterSpacing: -2.2, maxWidth: 700 },
  heroTitleWide: { fontSize: 72, lineHeight: 72, letterSpacing: -3.8 },
  heroBody: { marginTop: 24, color: palette.muted, fontSize: 17, lineHeight: 27, maxWidth: 650 },
  heroActions: { marginTop: 30, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 16 },
  heroNote: { color: palette.muted, fontSize: 12 },
  primaryButton: { alignSelf: "flex-start", minHeight: 50, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 999, backgroundColor: palette.ink, flexDirection: "row", alignItems: "center", gap: 14 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  primaryButtonArrow: { color: "#FFFFFF", fontSize: 16 },
  heroVisual: { flex: 1, position: "relative", alignItems: "center", justifyContent: "center", minHeight: 570 },
  heroVisualWide: { minHeight: 640 },
  glowOne: { position: "absolute", width: 360, height: 360, borderRadius: 180, backgroundColor: "#E3D9F3", top: 22, right: 20, opacity: 0.8 },
  glowTwo: { position: "absolute", width: 260, height: 260, borderRadius: 130, backgroundColor: "#E7EFE8", bottom: 40, left: 18, opacity: 0.9 },
  demoShell: { width: "100%", maxWidth: 455, backgroundColor: "rgba(255,255,255,0.82)", borderRadius: 34, padding: 22, borderWidth: 1, borderColor: "rgba(255,255,255,0.95)", shadowColor: "#6C617E", shadowOffset: { width: 0, height: 24 }, shadowOpacity: 0.18, shadowRadius: 45, elevation: 8 },
  demoHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 35 },
  demoBrand: { fontWeight: "700", fontSize: 16, color: palette.ink },
  sandboxPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: palette.greenSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.green },
  sandboxText: { fontSize: 9, fontWeight: "800", letterSpacing: 1, color: palette.green },
  balanceLabel: { color: palette.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1.5 },
  balance: { color: palette.ink, fontSize: 46, lineHeight: 54, fontWeight: "700", letterSpacing: -2, marginBottom: 22 },
  operatorCard: { padding: 18, borderRadius: 24, backgroundColor: palette.lavender, marginBottom: 12 },
  eyebrow: { color: palette.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1.4 },
  operatorPrompt: { color: palette.ink, fontSize: 20, lineHeight: 26, fontWeight: "650", marginTop: 8, marginBottom: 14 },
  commandBubble: { backgroundColor: "rgba(255,255,255,0.8)", borderRadius: 18, padding: 14 },
  commandText: { color: palette.ink, fontSize: 13, lineHeight: 20 },
  planCard: { padding: 18, borderRadius: 24, backgroundColor: "#FFFFFF" },
  planTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  guardBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: palette.greenSoft },
  guardBadgeText: { fontSize: 9, color: palette.green, fontWeight: "800", letterSpacing: 0.7 },
  planRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 9 },
  planTitle: { color: palette.ink, fontSize: 14, fontWeight: "700" },
  planMeta: { color: palette.muted, fontSize: 10, marginTop: 2 },
  planAmount: { color: palette.ink, fontSize: 15, fontWeight: "700" },
  divider: { height: 1, backgroundColor: palette.line },
  planFooter: { marginTop: 15, paddingTop: 14, borderTopWidth: 1, borderTopColor: palette.line, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  planAfter: { color: palette.ink, fontSize: 22, fontWeight: "700", letterSpacing: -0.8 },
  statementSection: { width: "100%", maxWidth: 1240, alignSelf: "center", paddingHorizontal: 24, paddingVertical: 90 },
  sectionHeadline: { color: palette.ink, fontSize: 36, lineHeight: 41, fontWeight: "650", letterSpacing: -1.6, maxWidth: 880, marginTop: 14 },
  sectionHeadlineWide: { fontSize: 52, lineHeight: 57, letterSpacing: -2.6 },
  sectionBody: { color: palette.muted, fontSize: 16, lineHeight: 25, maxWidth: 760, marginTop: 22 },
  flowGrid: { width: "100%", maxWidth: 1240, alignSelf: "center", paddingHorizontal: 24, paddingBottom: 100, gap: 8 },
  flowGridWide: { flexDirection: "row" },
  flowStep: { minHeight: 92, backgroundColor: "#FFFFFF", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: palette.line, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  flowStepWide: { flex: 1, minHeight: 132, flexDirection: "column", alignItems: "flex-start" },
  flowIndex: { color: palette.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1.3 },
  flowLabel: { color: palette.ink, fontSize: 15, fontWeight: "700" },
  flowArrow: { color: palette.lavenderStrong, fontSize: 20 },
  mvpSection: { width: "100%", backgroundColor: palette.lavender, paddingHorizontal: 24, paddingVertical: 90, gap: 40 },
  mvpSectionWide: { flexDirection: "row", justifyContent: "center", alignItems: "flex-start", gap: 70 },
  mvpIntro: { flex: 0.8, maxWidth: 480 },
  mvpCard: { flex: 1.2, maxWidth: 680, backgroundColor: "rgba(255,255,255,0.66)", borderWidth: 1, borderColor: "rgba(255,255,255,0.9)", borderRadius: 30, padding: 24 },
  quote: { color: palette.ink, fontSize: 24, lineHeight: 32, fontWeight: "650", letterSpacing: -0.8, marginBottom: 24 },
  mvpFeatureGrid: { gap: 12 },
  mvpFeature: { borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 15, paddingBottom: 8 },
  mvpFeatureTitle: { color: palette.ink, fontSize: 17, fontWeight: "700", marginTop: 6 },
  mvpFeatureCopy: { color: palette.muted, fontSize: 13, lineHeight: 20, marginTop: 5 },
  guardSection: { width: "100%", backgroundColor: palette.ink, paddingHorizontal: 24, paddingVertical: 100, alignItems: "center" },
  guardPanel: { width: "100%", maxWidth: 900, backgroundColor: "#252529", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: 30, padding: 26 },
  guardTitleRow: { flexDirection: "row", flexWrap: "wrap", gap: 20, justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  guardTitle: { color: "#FFFFFF", fontSize: 30, lineHeight: 36, fontWeight: "650", letterSpacing: -1.2, marginTop: 8, maxWidth: 560 },
  safeBadge: { backgroundColor: "#CFE1D2", borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
  safeBadgeText: { color: "#294D33", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" },
  checkIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#334D39", alignItems: "center", justifyContent: "center" },
  checkIconText: { color: "#CFE1D2", fontWeight: "800" },
  checkText: { color: "#F2F0F4", fontSize: 14 },
  infrastructureSection: { width: "100%", maxWidth: 1240, alignSelf: "center", paddingHorizontal: 24, paddingVertical: 110 },
  architectureRow: { marginTop: 44, gap: 8 },
  architectureRowWide: { flexDirection: "row" },
  architectureItem: { flex: 1, minHeight: 110, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: palette.line, padding: 15, justifyContent: "space-between" },
  architectureIndex: { color: palette.muted, fontSize: 10, fontWeight: "800" },
  architectureText: { color: palette.ink, fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  futureSection: { width: "100%", backgroundColor: "#F0EEE9", paddingHorizontal: 24, paddingVertical: 100 },
  futureHeader: { width: "100%", maxWidth: 1240, alignSelf: "center", flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 24, alignItems: "flex-end" },
  futureHeaderCopy: { flex: 1, minWidth: 280 },
  futureNote: { color: palette.muted, fontSize: 11, lineHeight: 17, maxWidth: 310 },
  futureGrid: { width: "100%", maxWidth: 1240, alignSelf: "center", marginTop: 48, gap: 12 },
  futureGridWide: { flexDirection: "row", flexWrap: "wrap" },
  futureCard: { minHeight: 270, borderRadius: 26, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: palette.line, padding: 22, flexGrow: 1, flexBasis: 300, justifyContent: "space-between" },
  futureCardFeatured: { backgroundColor: palette.lavender },
  futureTitle: { color: palette.ink, fontSize: 24, lineHeight: 30, fontWeight: "650", letterSpacing: -0.8, marginTop: 18 },
  futureCopy: { color: palette.muted, fontSize: 13, lineHeight: 20, marginTop: 26 },
  visionSection: { width: "100%", backgroundColor: "#D9D2E8", paddingHorizontal: 24, paddingVertical: 120, alignItems: "center" },
  visionKicker: { color: palette.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1.5, marginBottom: 22 },
  visionTitle: { color: palette.ink, textAlign: "center", fontSize: 40, lineHeight: 45, fontWeight: "650", letterSpacing: -1.8, maxWidth: 1050 },
  visionTitleWide: { fontSize: 58, lineHeight: 63, letterSpacing: -3 },
  visionFooter: { width: "100%", maxWidth: 920, marginTop: 42, flexDirection: "row", flexWrap: "wrap", gap: 22, justifyContent: "space-between", alignItems: "center" },
  visionPrinciple: { color: palette.muted, fontSize: 13, lineHeight: 20, maxWidth: 560 },
  footer: { width: "100%", maxWidth: 1240, alignSelf: "center", paddingHorizontal: 24, paddingVertical: 42, borderTopWidth: 1, borderTopColor: palette.line, flexDirection: "row", flexWrap: "wrap", gap: 14, alignItems: "center" },
  footerBrand: { color: palette.ink, fontSize: 17, fontWeight: "800" },
  footerCopy: { color: palette.muted, fontSize: 12 },
  footerMeta: { color: palette.muted, fontSize: 10, marginLeft: "auto" }
});
