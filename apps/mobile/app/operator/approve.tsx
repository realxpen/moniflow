import { PlaceholderScreen } from "@/components/ui";

export default function ApprovalScreen() {
  return (
    <PlaceholderScreen
      description="This Consequence Mode route reserves explicit human authorization. The Phase 1 button only advances a UI preview and cannot authorize money movement."
      eyebrow="APPROVAL · NOT ACTIVE"
      nextHref="/operator/signing"
      nextLabel="Continue UI preview"
      title="You stay in control."
    />
  );
}
