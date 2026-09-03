import { PlaceholderScreen } from "@/components/ui";

export default function WalletSetupScreen() {
  return (
    <PlaceholderScreen
      description="No wallet is provisioned in Phase 1. This route reserves the future on-device wallet and signing boundary."
      eyebrow="WALLET · PLACEHOLDER"
      nextHref="/onboarding/success"
      title="A wallet you control."
    />
  );
}
