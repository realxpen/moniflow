import { PlaceholderScreen } from "@/components/ui";

export default function BankVerifyScreen() {
  return (
    <PlaceholderScreen
      description="This route will display a real verified account holder only after provider-backed verification is implemented."
      eyebrow="VERIFICATION · PLACEHOLDER"
      nextHref="/bank/success"
      title="Verify before movement."
    />
  );
}
