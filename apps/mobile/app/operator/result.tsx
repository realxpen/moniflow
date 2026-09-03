import { PlaceholderScreen } from "@/components/ui";

export default function ResultScreen() {
  return (
    <PlaceholderScreen
      description="Phase 1 cannot report provider success. A later result screen will show verified BMONI status or an honest failure state."
      eyebrow="RESULT · NO PROVIDER DATA"
      nextHref="/(tabs)/activity"
      nextLabel="View activity placeholder"
      title="Verification belongs to the provider."
    />
  );
}
