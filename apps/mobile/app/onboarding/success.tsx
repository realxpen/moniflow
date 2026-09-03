import { PlaceholderScreen } from "@/components/ui";

export default function OnboardingSuccessScreen() {
  return (
    <PlaceholderScreen
      description="This completion state is a navigation preview only. It does not claim a BMONI user, wallet, or identity check exists."
      eyebrow="SETUP PREVIEW"
      nextHref="/(tabs)/home"
      nextLabel="View workspace"
      title="Foundation ready."
    />
  );
}
