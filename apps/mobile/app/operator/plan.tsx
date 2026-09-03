import { PlaceholderScreen } from "@/components/ui";

export default function PlanScreen() {
  return (
    <PlaceholderScreen
      description="The Money Plan will show actions, amounts, destinations, balance impact, and approval requirements before anything can execute."
      eyebrow="MONEY PLAN · PREVIEW"
      nextHref="/operator/approve"
      title="Plan before execution."
    />
  );
}
